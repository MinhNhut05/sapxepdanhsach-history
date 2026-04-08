import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";
import type { ImportIssue } from "@/features/roster/domain/import-issue";
import { mapRosterHeaders } from "@/features/roster/lib/map-headers";
import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

import { readWorkbook } from "./read-workbook";
import {
  findDuplicateStudentCodeIssues,
  findSameNameBirthDateWarnings,
  isBlankWorkbookRow,
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
  summary: RosterImportSummary;
  students: CanonicalStudentRecord[];
  issues: ImportIssue[];
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

export async function importRosterWorkbook(
  input: ArrayBuffer | Buffer | Uint8Array,
): Promise<RosterImportResult> {
  const workbook = await readWorkbook(input);

  if (!workbook.ok) {
    return {
      ok: false,
      summary: createSummary(null, 0, workbook.issues, []),
      students: [],
      issues: workbook.issues,
    };
  }

  const headerMapResult = mapRosterHeaders(workbook.headerRow.values);

  if (!headerMapResult.ok || !headerMapResult.columns) {
    return {
      ok: false,
      summary: createSummary(
        workbook.worksheetName,
        workbook.dataRows.length,
        headerMapResult.issues,
        [],
      ),
      students: [],
      issues: headerMapResult.issues,
    };
  }

  const rowIssues: ImportIssue[] = [];
  const records: CanonicalStudentRecord[] = [];

  for (const row of workbook.dataRows) {
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

    if (validatedRow.record) {
      records.push(validatedRow.record);
    }
  }

  const duplicateIssues = findDuplicateStudentCodeIssues(records);
  const warningIssues = findSameNameBirthDateWarnings(records);
  const issues = [...rowIssues, ...duplicateIssues, ...warningIssues];
  const blockingIssues = issues.filter((issue) => issue.severity === "blocking");

  if (blockingIssues.length > 0) {
    return {
      ok: false,
      summary: createSummary(workbook.worksheetName, workbook.dataRows.length, issues, []),
      students: [],
      issues,
    };
  }

  const sortedStudents = sortStudentsByVietnameseName(records);

  return {
    ok: true,
    summary: createSummary(
      workbook.worksheetName,
      workbook.dataRows.length,
      issues,
      sortedStudents,
    ),
    students: sortedStudents,
    issues,
  };
}
