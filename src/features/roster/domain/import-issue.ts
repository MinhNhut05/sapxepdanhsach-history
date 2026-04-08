export type ImportIssueSeverity = "blocking" | "warning" | "info";

export interface ImportIssueBase {
  severity: ImportIssueSeverity;
  code: string;
  message: string;
  row?: number;
  column?: string;
  value?: string;
}

export interface BlockingImportIssue extends ImportIssueBase {
  severity: "blocking";
}

export interface WarningImportIssue extends ImportIssueBase {
  severity: "warning";
}

export interface InfoImportIssue extends ImportIssueBase {
  severity: "info";
}

export type ImportIssue =
  | BlockingImportIssue
  | WarningImportIssue
  | InfoImportIssue;
