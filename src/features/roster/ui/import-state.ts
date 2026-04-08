import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";
import type { ImportIssue } from "@/features/roster/domain/import-issue";

export const IMPORT_STATES = [
  "idle",
  "uploading",
  "success",
  "error",
] as const;

export type ImportState = (typeof IMPORT_STATES)[number];

export interface ImportSummaryData {
  worksheetName: string | null;
  totalRowsRead: number;
  validStudents: number;
  blockingIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export interface ImportResultPayload {
  ok: boolean;
  summary: ImportSummaryData;
  students: CanonicalStudentRecord[];
  issues: ImportIssue[];
}

export function createEmptyImportSummary(): ImportSummaryData {
  return {
    worksheetName: null,
    totalRowsRead: 0,
    validStudents: 0,
    blockingIssues: 0,
    warningIssues: 0,
    infoIssues: 0,
  };
}

export function createUploadError(message: string): ImportResultPayload {
  return {
    ok: false,
    summary: {
      ...createEmptyImportSummary(),
      blockingIssues: 1,
    },
    students: [],
    issues: [
      {
        severity: "blocking",
        code: "upload_request_failed",
        message,
      },
    ],
  };
}
