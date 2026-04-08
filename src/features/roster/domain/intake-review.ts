import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";

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
  requiresReview: boolean;
  autoApplied: boolean;
}

export interface IntakeConfidenceSummary {
  high: number;
  medium: number;
  low: number;
}

export interface IntakeReviewPayload {
  state: IntakeFlowState;
  confidence: IntakeConfidenceBand;
  summary: string;
  confidenceSummary: IntakeConfidenceSummary;
  unresolvedCount: number;
  items: IntakeReviewItem[];
  auditTrail: IntakeAuditRecord[];
  audit?: IntakeAuditRecord[];
  stagedStudents: CanonicalStudentRecord[];
}
