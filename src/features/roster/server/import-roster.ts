import type {
  IntakeFlowState,
  IntakeReviewPayload,
} from "@/features/roster/domain/intake-review";
import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";
import type { ImportIssue } from "@/features/roster/domain/import-issue";
import { mapRosterHeaders } from "@/features/roster/lib/map-headers";
import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";
import type { IntakeSourceFormat } from "@/features/roster/ui/import-state";

import { buildIntakeReview } from "./build-intake-review";
import { detectHeaderRow } from "./detect-header-row";
import { readIntakeFile } from "./read-intake-file";
import {
  findDuplicateStudentCodeIssues,
  findSameNameBirthDateWarnings,
  isBlankWorkbookRow,
  type RepairProposal,
  validateWorkbookRow,
} from "./row-validation";

export interface RosterImportSummary {
  worksheetName: string | null;
  totalRowsRead: number;
  validStudents: number;
  blockingIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export interface RosterImportResult {
  ok: boolean;
  intakeState: IntakeFlowState;
  sourceFormat: IntakeSourceFormat;
  requiresReview: boolean;
  fallbackUsed: boolean;
  summary: RosterImportSummary;
  students: CanonicalStudentRecord[];
  stagedStudents: CanonicalStudentRecord[];
  issues: ImportIssue[];
  review?: IntakeReviewPayload;
}

interface ImportRosterWorkbookOptions {
  fileName?: string;
  mimeType?: string;
}

function createSummary(
  worksheetName: string | null,
  totalRowsRead: number,
  issues: ImportIssue[],
  students: CanonicalStudentRecord[],
): RosterImportSummary {
  return {
    worksheetName,
    totalRowsRead,
    validStudents: students.length,
    blockingIssues: issues.filter((issue) => issue.severity === "blocking").length,
    warningIssues: issues.filter((issue) => issue.severity === "warning").length,
    infoIssues: issues.filter((issue) => issue.severity === "info").length,
  };
}

function blankRowWarning(rowNumber: number): ImportIssue {
  return {
    severity: "warning",
    code: "blank_row_skipped",
    row: rowNumber,
    message: "Phát hiện dòng trống trong vùng dữ liệu và đã bỏ qua.",
  };
}

function toHeaderAliasRepairs(
  headerValues: ReadonlyArray<unknown>,
  columns: ReturnType<typeof mapRosterHeaders>["columns"],
): RepairProposal[] {
  if (!columns) {
    return [];
  }

  const headerEntries = [
    ["className", columns.className, "Lớp"],
    ["studentCode", columns.studentCode, "MSHV"],
    ["middleName", columns.middleName, "HỌ LÓT"],
    ["firstName", columns.firstName, "TÊN"],
    ["birthDate", columns.birthDate, "NGÀY SINH"],
    ["birthPlace", columns.birthPlace, "NƠI SINH"],
    ["note", columns.note, "GHI CHÚ"],
  ] as const;

  return headerEntries.flatMap(([fieldKey, columnNumber, label]) => {
    if (!columnNumber) {
      return [];
    }

    const rawValue = String(headerValues[columnNumber - 1] ?? "");

    if (!rawValue || rawValue === label) {
      return [];
    }

    return [
      {
        fieldKey: "header" as const,
        label,
        rawValue,
        proposedValue: label,
        repairType: "header_alias_mapping" as const,
        source: "rule" as const,
        confidence: "high" as const,
        reason: `Nhận diện tiêu đề cột biến thể "${rawValue}" cho trường ${label}.`,
        sensitive: fieldKey === "className" || fieldKey === "studentCode",
      },
    ];
  });
}

function failureResult(
  sourceFormat: IntakeSourceFormat,
  worksheetName: string | null,
  totalRowsRead: number,
  issues: ImportIssue[],
): RosterImportResult {
  return {
    ok: false,
    intakeState: "failed",
    sourceFormat,
    requiresReview: false,
    fallbackUsed: false,
    summary: createSummary(worksheetName, totalRowsRead, issues, []),
    students: [],
    stagedStudents: [],
    issues,
  };
}

function toArrayBuffer(input: ArrayBuffer | Buffer | Uint8Array): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function importRosterWorkbook(
  input: ArrayBuffer | Buffer | Uint8Array,
  options: ImportRosterWorkbookOptions = {},
): Promise<RosterImportResult> {
  const arrayBuffer = toArrayBuffer(input);

  const intakeFile = await readIntakeFile(arrayBuffer, {
    fileName: options.fileName ?? "roster.xlsx",
    mimeType: options.mimeType,
  });

  if (intakeFile.rowCount === 0) {
    return failureResult(intakeFile.sourceFormat, intakeFile.sheetName, 0, [
      {
        severity: "blocking",
        code: "empty_workbook",
        message: "Tệp intake không có dữ liệu để import.",
      },
    ]);
  }

  const detectedHeader = detectHeaderRow(intakeFile.rows);
  const headerRowNumber = detectedHeader.headerRowIndex + 1;
  const headerMapResult = mapRosterHeaders(detectedHeader.headerValues);

  if (!headerMapResult.ok || !headerMapResult.columns) {
    return failureResult(
      intakeFile.sourceFormat,
      intakeFile.sheetName,
      Math.max(intakeFile.rowCount - detectedHeader.headerRowIndex - 1, 0),
      headerMapResult.issues,
    );
  }

  const rowIssues: ImportIssue[] = [];
  const records: CanonicalStudentRecord[] = [];
  const headerRepairs = toHeaderAliasRepairs(
    detectedHeader.headerValues,
    headerMapResult.columns,
  );

  if (detectedHeader.headerRowIndex > 0) {
    rowIssues.push({
      severity: "warning",
      code: "title_row_skipped",
      row: 1,
      message: "Đã bỏ qua title row trước phần header dữ liệu.",
    });
  }

  const repairs: RepairProposal[] = [...headerRepairs];

  const dataRows = intakeFile.rows
    .slice(detectedHeader.headerRowIndex + 1)
    .map((values, index) => ({
      rowNumber: headerRowNumber + index + 1,
      values,
    }));

  for (const row of dataRows) {
    if (isBlankWorkbookRow(row.values)) {
      rowIssues.push(blankRowWarning(row.rowNumber));
      continue;
    }

    const validatedRow = validateWorkbookRow({
      rowNumber: row.rowNumber,
      values: row.values,
      columns: headerMapResult.columns,
    });

    rowIssues.push(...validatedRow.issues);
    repairs.push(...validatedRow.repairs);

    if (validatedRow.record) {
      records.push(validatedRow.record);
    }
  }

  const duplicateIssues = findDuplicateStudentCodeIssues(records);
  const warningIssues = findSameNameBirthDateWarnings(records);
  const issues = [...rowIssues, ...duplicateIssues, ...warningIssues];
  const blockingIssues = issues.filter((issue) => issue.severity === "blocking");

  if (blockingIssues.length > 0) {
    return failureResult(
      intakeFile.sourceFormat,
      intakeFile.sheetName,
      dataRows.length,
      issues,
    );
  }

  const sortedStudents = sortStudentsByVietnameseName(records);
  const review = buildIntakeReview({
    students: sortedStudents,
    repairs,
    issues,
  });

  const ready = review.unresolvedCount === 0;

  return {
    ok: true,
    intakeState: ready ? "ready" : "review_required",
    sourceFormat: intakeFile.sourceFormat,
    requiresReview: !ready,
    fallbackUsed: intakeFile.sourceFormat === "csv",
    review,
    summary: createSummary(
      intakeFile.sheetName,
      dataRows.length,
      issues,
      sortedStudents,
    ),
    students: ready ? sortedStudents : [],
    stagedStudents: review.stagedStudents,
    issues,
  };
}
