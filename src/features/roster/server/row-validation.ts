import type {
  IntakeConfidenceBand,
} from "@/features/roster/domain/intake-review";
import type {
  CanonicalStudentRecord,
  RawBirthDateValue,
  RawStudentFieldValues,
} from "@/features/roster/domain/student-record";
import type { ImportIssue } from "@/features/roster/domain/import-issue";
import {
  OPTIONAL_ROSTER_HEADERS,
  REQUIRED_ROSTER_HEADERS,
  type RosterHeaderMap,
} from "@/features/roster/lib/map-headers";
import { parseBirthDateValue } from "@/features/roster/lib/parse-birth-date";
import {
  normalizeVietnameseText,
  toDisplayNameCase,
} from "@/features/roster/lib/normalize-vietnamese";

export interface ValidateWorkbookRowInput {
  rowNumber: number;
  values: ReadonlyArray<unknown>;
  columns: RosterHeaderMap;
}

export interface RepairProposal {
  fieldKey:
    | keyof Pick<
        RawStudentFieldValues,
        | "className"
        | "studentCode"
        | "middleName"
        | "firstName"
        | "birthDate"
        | "birthPlace"
        | "note"
      >
    | "header";
  label: string;
  rawValue: string | null;
  proposedValue: string | null;
  repairType:
    | "whitespace_cleanup"
    | "casing_normalization"
    | "birth_date_cleanup"
    | "birth_place_cleanup"
    | "note_cleanup"
    | "header_alias_mapping";
  source: "rule" | "ai";
  confidence: IntakeConfidenceBand;
  reason: string;
  sensitive: boolean;
}

export interface ValidateWorkbookRowResult {
  record?: CanonicalStudentRecord;
  issues: ImportIssue[];
  repairs: RepairProposal[];
}

export const SAFE_AUTO_APPLY_REPAIR_TYPES = [
  "whitespace_cleanup",
  "casing_normalization",
  "birth_date_cleanup",
  "birth_place_cleanup",
  "note_cleanup",
  "header_alias_mapping",
] as const;

export type SafeAutoApplyRepairType = (typeof SAFE_AUTO_APPLY_REPAIR_TYPES)[number];

const REQUIRED_FIELD_LABELS = {
  className: REQUIRED_ROSTER_HEADERS.className,
  studentCode: REQUIRED_ROSTER_HEADERS.studentCode,
  middleName: REQUIRED_ROSTER_HEADERS.middleName,
  firstName: REQUIRED_ROSTER_HEADERS.firstName,
  birthDate: REQUIRED_ROSTER_HEADERS.birthDate,
  birthPlace: REQUIRED_ROSTER_HEADERS.birthPlace,
} as const;

function getCellValue(values: ReadonlyArray<unknown>, columnNumber: number): unknown {
  return values[columnNumber - 1];
}

function stringifyCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function createMissingFieldIssue(
  rowNumber: number,
  columnLabel: string,
  rawValue: unknown,
): ImportIssue {
  return {
    severity: "blocking",
    code: "missing_required_value",
    row: rowNumber,
    column: columnLabel,
    value: stringifyCellValue(rawValue),
    message: `Thiếu dữ liệu bắt buộc cho cột ${columnLabel}.`,
  };
}

function createNormalizationIssue(
  rowNumber: number,
  columnLabel: string,
  rawValue: string,
  canonicalValue: string,
): ImportIssue | null {
  if (rawValue === canonicalValue) {
    return null;
  }

  return {
    severity: "info",
    code: `normalized_${columnLabel.toLocaleLowerCase("vi-VN").replace(/\s+/g, "_")}`,
    row: rowNumber,
    column: columnLabel,
    value: rawValue,
    message: `Giá trị cột ${columnLabel} đã được chuẩn hóa thành "${canonicalValue}".`,
  };
}

function toRequiredTextValue(
  rowNumber: number,
  values: ReadonlyArray<unknown>,
  columnNumber: number,
  columnLabel: string,
): { raw: string; issues: ImportIssue[] } {
  const rawValue = getCellValue(values, columnNumber);
  const rawText = stringifyCellValue(rawValue);

  if (!normalizeVietnameseText(rawText)) {
    return {
      raw: rawText,
      issues: [createMissingFieldIssue(rowNumber, columnLabel, rawValue)],
    };
  }

  return {
    raw: rawText,
    issues: [],
  };
}

function toOptionalTextValue(
  values: ReadonlyArray<unknown>,
  columnNumber: number | undefined,
): string | null {
  if (!columnNumber) {
    return null;
  }

  const rawText = stringifyCellValue(getCellValue(values, columnNumber));
  return rawText ? rawText : null;
}

function pushRepairIfChanged(
  repairs: RepairProposal[],
  input: {
    fieldKey: RepairProposal["fieldKey"];
    label: string;
    rawValue: string | null;
    proposedValue: string | null;
    repairType: RepairProposal["repairType"];
    reason: string;
    sensitive?: boolean;
  },
): void {
  if (input.rawValue === input.proposedValue) {
    return;
  }

  repairs.push({
    fieldKey: input.fieldKey,
    label: input.label,
    rawValue: input.rawValue,
    proposedValue: input.proposedValue,
    repairType: input.repairType,
    source: "rule",
    confidence: "high",
    reason: input.reason,
    sensitive: input.sensitive ?? false,
  });
}

export function isBlankWorkbookRow(values: ReadonlyArray<unknown>): boolean {
  return values.every((value) => {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === "string") {
      return normalizeVietnameseText(value).length === 0;
    }

    return false;
  });
}

export function validateWorkbookRow({
  rowNumber,
  values,
  columns,
}: ValidateWorkbookRowInput): ValidateWorkbookRowResult {
  const className = toRequiredTextValue(
    rowNumber,
    values,
    columns.className,
    REQUIRED_FIELD_LABELS.className,
  );
  const studentCode = toRequiredTextValue(
    rowNumber,
    values,
    columns.studentCode,
    REQUIRED_FIELD_LABELS.studentCode,
  );
  const middleName = toRequiredTextValue(
    rowNumber,
    values,
    columns.middleName,
    REQUIRED_FIELD_LABELS.middleName,
  );
  const firstName = toRequiredTextValue(
    rowNumber,
    values,
    columns.firstName,
    REQUIRED_FIELD_LABELS.firstName,
  );
  const birthPlace = toRequiredTextValue(
    rowNumber,
    values,
    columns.birthPlace,
    REQUIRED_FIELD_LABELS.birthPlace,
  );

  const issues = [
    ...className.issues,
    ...studentCode.issues,
    ...middleName.issues,
    ...firstName.issues,
    ...birthPlace.issues,
  ];

  const rawBirthDate = getCellValue(values, columns.birthDate) as RawBirthDateValue;
  const parsedBirthDate = parseBirthDateValue(rawBirthDate);

  if (!parsedBirthDate.ok) {
    issues.push({
      severity: "blocking",
      code: parsedBirthDate.code,
      row: rowNumber,
      column: REQUIRED_FIELD_LABELS.birthDate,
      value: stringifyCellValue(rawBirthDate),
      message: parsedBirthDate.message,
    });

    return { issues, repairs: [] };
  }

  if (issues.some((issue) => issue.severity === "blocking")) {
    return { issues, repairs: [] };
  }

  const rawRecord: RawStudentFieldValues = {
    className: className.raw,
    studentCode: studentCode.raw,
    middleName: middleName.raw,
    firstName: firstName.raw,
    birthDate: rawBirthDate,
    birthPlace: birthPlace.raw,
    note: toOptionalTextValue(values, columns.note),
  };

  const canonicalNote = rawRecord.note
    ? normalizeVietnameseText(rawRecord.note) || null
    : null;

  const canonicalRecord: CanonicalStudentRecord = {
    rowIndex: rowNumber,
    raw: rawRecord,
    canonical: {
      className: normalizeVietnameseText(rawRecord.className),
      studentCode: normalizeVietnameseText(rawRecord.studentCode),
      middleName: toDisplayNameCase(rawRecord.middleName),
      firstName: toDisplayNameCase(rawRecord.firstName),
      fullName: [
        toDisplayNameCase(rawRecord.middleName),
        toDisplayNameCase(rawRecord.firstName),
      ]
        .filter(Boolean)
        .join(" "),
      birthDateIso: parsedBirthDate.birthDateIso,
      birthPlace: toDisplayNameCase(rawRecord.birthPlace),
      note: canonicalNote,
    },
    birthDateIso: parsedBirthDate.birthDateIso,
  };

  const normalizationIssues = [
    createNormalizationIssue(
      rowNumber,
      REQUIRED_FIELD_LABELS.className,
      rawRecord.className,
      canonicalRecord.canonical.className,
    ),
    createNormalizationIssue(
      rowNumber,
      REQUIRED_FIELD_LABELS.studentCode,
      rawRecord.studentCode,
      canonicalRecord.canonical.studentCode,
    ),
    createNormalizationIssue(
      rowNumber,
      REQUIRED_FIELD_LABELS.middleName,
      rawRecord.middleName,
      canonicalRecord.canonical.middleName,
    ),
    createNormalizationIssue(
      rowNumber,
      REQUIRED_FIELD_LABELS.firstName,
      rawRecord.firstName,
      canonicalRecord.canonical.firstName,
    ),
    createNormalizationIssue(
      rowNumber,
      REQUIRED_FIELD_LABELS.birthPlace,
      rawRecord.birthPlace,
      canonicalRecord.canonical.birthPlace,
    ),
    rawRecord.note
      ? createNormalizationIssue(
          rowNumber,
          OPTIONAL_ROSTER_HEADERS.note,
          rawRecord.note,
          canonicalNote ?? "",
        )
      : null,
  ].filter((issue): issue is ImportIssue => issue !== null);

  if (parsedBirthDate.source === "text-short-year") {
    normalizationIssues.push({
      severity: "warning",
      code: "normalized_birth_date_short_year",
      row: rowNumber,
      column: REQUIRED_FIELD_LABELS.birthDate,
      value: stringifyCellValue(rawBirthDate),
      message: `Ngày sinh thiếu 1 chữ số năm và đã được chuẩn hóa thành "${canonicalRecord.birthDateIso}".`,
    });
  }

  const repairs: RepairProposal[] = [];

  pushRepairIfChanged(repairs, {
    fieldKey: "className",
    label: REQUIRED_FIELD_LABELS.className,
    rawValue: rawRecord.className,
    proposedValue: canonicalRecord.canonical.className,
    repairType: "whitespace_cleanup",
    reason: "Chuẩn hóa khoảng trắng cho tên lớp.",
    sensitive: true,
  });
  pushRepairIfChanged(repairs, {
    fieldKey: "studentCode",
    label: REQUIRED_FIELD_LABELS.studentCode,
    rawValue: rawRecord.studentCode,
    proposedValue: canonicalRecord.canonical.studentCode,
    repairType: "whitespace_cleanup",
    reason: "Chuẩn hóa khoảng trắng cho MSHV.",
    sensitive: true,
  });
  pushRepairIfChanged(repairs, {
    fieldKey: "middleName",
    label: REQUIRED_FIELD_LABELS.middleName,
    rawValue: rawRecord.middleName,
    proposedValue: canonicalRecord.canonical.middleName,
    repairType: "casing_normalization",
    reason: "Chuẩn hóa viết hoa/thường cho họ lót.",
  });
  pushRepairIfChanged(repairs, {
    fieldKey: "firstName",
    label: REQUIRED_FIELD_LABELS.firstName,
    rawValue: rawRecord.firstName,
    proposedValue: canonicalRecord.canonical.firstName,
    repairType: "casing_normalization",
    reason: "Chuẩn hóa viết hoa/thường cho tên.",
  });
  pushRepairIfChanged(repairs, {
    fieldKey: "birthPlace",
    label: REQUIRED_FIELD_LABELS.birthPlace,
    rawValue: rawRecord.birthPlace,
    proposedValue: canonicalRecord.canonical.birthPlace,
    repairType: "birth_place_cleanup",
    reason: "Chuẩn hóa nơi sinh để hiển thị nhất quán.",
  });
  pushRepairIfChanged(repairs, {
    fieldKey: "note",
    label: OPTIONAL_ROSTER_HEADERS.note,
    rawValue: rawRecord.note ?? null,
    proposedValue: canonicalNote,
    repairType: "note_cleanup",
    reason: "Chuẩn hóa ghi chú bằng cách bỏ khoảng trắng thừa.",
  });
  pushRepairIfChanged(repairs, {
    fieldKey: "birthDate",
    label: REQUIRED_FIELD_LABELS.birthDate,
    rawValue: stringifyCellValue(rawBirthDate),
    proposedValue: canonicalRecord.birthDateIso,
    repairType: "birth_date_cleanup",
    reason: "Chuẩn hóa ngày sinh về định dạng ISO hỗ trợ.",
  });

  return {
    record: canonicalRecord,
    issues: normalizationIssues,
    repairs,
  };
}

export function findDuplicateStudentCodeIssues(
  records: CanonicalStudentRecord[],
): ImportIssue[] {
  const seen = new Map<string, CanonicalStudentRecord>();
  const issues: ImportIssue[] = [];

  for (const record of records) {
    const duplicate = seen.get(record.canonical.studentCode);

    if (duplicate) {
      issues.push({
        severity: "blocking",
        code: "duplicate_student_code",
        row: record.rowIndex,
        column: REQUIRED_FIELD_LABELS.studentCode,
        value: record.canonical.studentCode,
        message: `MSHV "${record.canonical.studentCode}" bị trùng với dòng ${duplicate.rowIndex}.`,
      });
      continue;
    }

    seen.set(record.canonical.studentCode, record);
  }

  return issues;
}

export function findSameNameBirthDateWarnings(
  records: CanonicalStudentRecord[],
): ImportIssue[] {
  const groupedRecords = new Map<string, CanonicalStudentRecord[]>();

  for (const record of records) {
    const key = `${record.canonical.fullName}|${record.birthDateIso}`;
    const currentGroup = groupedRecords.get(key) ?? [];
    currentGroup.push(record);
    groupedRecords.set(key, currentGroup);
  }

  return Array.from(groupedRecords.values()).flatMap((group) => {
    const distinctStudentCodes = new Set(
      group.map((record) => record.canonical.studentCode),
    );

    if (group.length < 2 || distinctStudentCodes.size < 2) {
      return [];
    }

    return group.map<ImportIssue>((record) => ({
      severity: "warning",
      code: "same_name_birth_date_different_student_code",
      row: record.rowIndex,
      column: REQUIRED_FIELD_LABELS.studentCode,
      value: record.canonical.studentCode,
      message:
        "Phát hiện học viên trùng họ tên và ngày sinh nhưng khác MSHV. Cần người dùng kiểm tra lại.",
    }));
  });
}
