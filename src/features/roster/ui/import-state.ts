import type { ImportIssue } from "@/features/roster/domain/import-issue";
import type {
  IntakeFlowState,
  IntakeReviewPayload,
} from "@/features/roster/domain/intake-review";
import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";

export const IMPORT_STATES = [
  "idle",
  "uploading",
  "success",
  "error",
] as const;

export type ImportState = (typeof IMPORT_STATES)[number];

export type IntakeSourceFormat = "xlsx" | "xls" | "csv" | "unknown";

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
  sourceFileName?: string | null;
  intakeState: IntakeFlowState;
  sourceFormat: IntakeSourceFormat;
  requiresReview: boolean;
  fallbackUsed: boolean;
  review?: IntakeReviewPayload;
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
    sourceFileName: null,
    intakeState: "failed",
    sourceFormat: "unknown",
    requiresReview: false,
    fallbackUsed: false,
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
