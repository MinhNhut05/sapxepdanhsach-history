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
import { handleIntakeAiFailure } from "./intake-ai-fallback";
import { createIntakeAiProvider } from "./intake-ai-provider";
import { getSmartIntakeConfig } from "./intake-config";
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

function createAiRepairProposal(input: {
  fieldKey: RepairProposal["fieldKey"];
  label: string;
  rawValue: string | null;
  proposedValue: string | null;
  confidence: RepairProposal["confidence"];
  reasoning: string;
  sensitive?: boolean;
}): RepairProposal {
  return {
    fieldKey: input.fieldKey,
    label: input.label,
    rawValue: input.rawValue,
    proposedValue: input.proposedValue,
    repairType: "note_cleanup",
    source: "ai",
    confidence: input.confidence,
    reason: input.reasoning,
    sensitive: input.sensitive ?? false,
  };
}

function applyAiSuggestions(
  review: IntakeReviewPayload,
  aiRepairs: RepairProposal[],
): IntakeReviewPayload {
  if (aiRepairs.length === 0) {
    return review;
  }

  const appendedReview = buildIntakeReview({
    students: review.stagedStudents,
    repairs: aiRepairs,
    issues: [],
  });

  const mergedItems = [...review.items, ...appendedReview.items];
  const mergedAuditTrail = [...review.auditTrail, ...appendedReview.auditTrail].map(
    (record, index) => ({
      ...record,
      id: `audit-${index + 1}`,
    }),
  );
  const mergedUnresolvedCount = mergedItems.filter((item) => item.requiresReview).length;

  return {
    ...review,
    state: mergedUnresolvedCount > 0 ? "review_required" : "ready",
    items: mergedItems.map((item, index) => ({
      ...item,
      id: `review-${index + 1}`,
      source: item.source ?? "ai",
      requiresReview:
        item.fieldKey === "studentCode" || item.fieldKey === "className"
          ? true
          : item.requiresReview,
      autoApplied:
        item.fieldKey === "studentCode" || item.fieldKey === "className"
          ? false
          : item.autoApplied,
    })),
    auditTrail: mergedAuditTrail,
    audit: mergedAuditTrail,
    unresolvedCount: mergedUnresolvedCount,
    confidenceSummary: {
      high: mergedItems.filter((item) => item.confidence === "high").length,
      medium: mergedItems.filter((item) => item.confidence === "medium").length,
      low: mergedItems.filter((item) => item.confidence === "low").length,
    },
    summary:
      mergedUnresolvedCount > 0
        ? `Có ${mergedUnresolvedCount} thay đổi cần người dùng review trước khi tiếp tục.`
        : "Không có thay đổi nhạy cảm hoặc mơ hồ cần review.",
  };
}

function shouldRequestAiSuggestions(review: IntakeReviewPayload): boolean {
  return review.items.some(
    (item) => item.confidence !== "high" || item.fieldKey === "studentCode" || item.fieldKey === "className",
  );
}

function createFallbackIssue(message: string): ImportIssue {
  return {
    severity: "info",
    code: "smart_intake_ai_fallback",
    message,
  };
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

  const config = getSmartIntakeConfig();
  const provider = createIntakeAiProvider(config);
  const shouldConsultAi = shouldRequestAiSuggestions(review);
  let fallbackUsed = intakeFile.sourceFormat === "csv";
  let reviewPayload = review;
  let issueList = issues;

  if (provider && shouldConsultAi) {
    try {
      const suggestions = await provider.suggestRepairs({
        sourceFormat: intakeFile.sourceFormat,
        students: sortedStudents,
        issues,
        repairs,
      });
      const aiRepairs = suggestions.map((suggestion) =>
        createAiRepairProposal({
          fieldKey: suggestion.fieldKey,
          label: suggestion.label,
          rawValue: suggestion.rawValue,
          proposedValue: suggestion.proposedValue,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
          sensitive: suggestion.sensitive,
        }),
      );
      reviewPayload = applyAiSuggestions(review, aiRepairs);
    } catch (error) {
      const fallback = handleIntakeAiFailure(error);
      fallbackUsed = true;
      issueList = [...issueList, createFallbackIssue(fallback.message)];
    }
  } else if (shouldConsultAi) {
    fallbackUsed = true;
    issueList = [
      ...issueList,
      createFallbackIssue(
        "Smart Intake AI chưa sẵn sàng nên hệ thống dùng rule-based review.",
      ),
    ];
  }

  const ready = reviewPayload.unresolvedCount === 0;

  return {
    ok: true,
    intakeState: ready ? "ready" : "review_required",
    sourceFormat: intakeFile.sourceFormat,
    requiresReview: !ready,
    fallbackUsed,
    review: reviewPayload,
    summary: createSummary(
      intakeFile.sheetName,
      dataRows.length,
      issueList,
      sortedStudents,
    ),
    students: ready ? sortedStudents : [],
    stagedStudents: reviewPayload.stagedStudents,
    issues: issueList,
  };
}
