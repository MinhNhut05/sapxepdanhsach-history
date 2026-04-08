export type IntakeFlowState = "ready" | "review_required" | "failed";

export type IntakeConfidenceBand = "high" | "medium" | "low";

export interface IntakeAuditRecord {
  id: string;
  scope: "header" | "row" | "field";
  fieldKey: string;
  rowIndex?: number;
  rawValue: string | null;
  proposedValue: string | null;
  decisionSource: "rule" | "ai";
  confidence: IntakeConfidenceBand;
  reason: string;
  autoApplied: boolean;
  sensitive: boolean;
}

export interface IntakeReviewItem {
  id: string;
  fieldKey: string;
  rowIndex?: number;
  label: string;
  currentValue: string | null;
  proposedValue: string | null;
  confidence: IntakeConfidenceBand;
  reason: string;
  source: "rule" | "ai";
  sensitive: boolean;
}

export interface IntakeReviewPayload {
  state: IntakeFlowState;
  confidence: IntakeConfidenceBand;
  summary: string;
  items: IntakeReviewItem[];
  audit: IntakeAuditRecord[];
}
