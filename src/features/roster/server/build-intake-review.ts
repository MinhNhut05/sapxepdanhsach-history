import type {
  IntakeAuditRecord,
  IntakeConfidenceBand,
  IntakeReviewItem,
  IntakeReviewPayload,
} from "@/features/roster/domain/intake-review";
import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";
import type { ImportIssue } from "@/features/roster/domain/import-issue";

import {
  SAFE_AUTO_APPLY_REPAIR_TYPES,
  type RepairProposal,
} from "./row-validation";

interface BuildIntakeReviewInput {
  students: CanonicalStudentRecord[];
  repairs: RepairProposal[];
  issues: ImportIssue[];
}

function isSensitiveField(fieldKey: string): boolean {
  return fieldKey === "studentCode" || fieldKey === "className";
}

function canAutoApplyRepair(repair: RepairProposal): boolean {
  if (isSensitiveField(repair.fieldKey)) {
    return false;
  }

  return (
    repair.source === "rule" &&
    repair.confidence === "high" &&
    SAFE_AUTO_APPLY_REPAIR_TYPES.includes(repair.repairType)
  );
}

function toAuditRecord(repair: RepairProposal, index: number): IntakeAuditRecord {
  return {
    id: `audit-${index + 1}`,
    scope: repair.fieldKey === "header" ? "header" : "field",
    fieldKey: repair.fieldKey,
    rowIndex: repair.fieldKey === "header" ? undefined : index + 1,
    rawValue: repair.rawValue,
    proposedValue: repair.proposedValue,
    decisionSource: repair.source,
    confidence: repair.confidence,
    reason: repair.reason,
    autoApplied: canAutoApplyRepair(repair),
    sensitive: repair.sensitive || isSensitiveField(repair.fieldKey),
  };
}

function toReviewItem(
  repair: RepairProposal,
  auditRecord: IntakeAuditRecord,
  index: number,
): IntakeReviewItem {
  const requiresReview = !auditRecord.autoApplied;

  return {
    id: `review-${index + 1}`,
    fieldKey: repair.fieldKey,
    rowIndex: repair.fieldKey === "header" ? undefined : index + 1,
    label: repair.label,
    currentValue: repair.rawValue,
    proposedValue: repair.proposedValue,
    confidence: repair.confidence,
    reason: repair.reason,
    source: repair.source,
    sensitive: auditRecord.sensitive,
    requiresReview,
    autoApplied: auditRecord.autoApplied,
  };
}

function createConfidenceSummary(items: IntakeReviewItem[]): {
  high: number;
  medium: number;
  low: number;
} {
  return items.reduce(
    (summary, item) => {
      summary[item.confidence] += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function overallConfidence(items: IntakeReviewItem[]): IntakeConfidenceBand {
  if (items.some((item) => item.confidence === "low")) {
    return "low";
  }

  if (items.some((item) => item.confidence === "medium")) {
    return "medium";
  }

  return "high";
}

export function buildIntakeReview({
  students,
  repairs,
}: BuildIntakeReviewInput): IntakeReviewPayload {
  const auditTrail = repairs.map((repair, index) => toAuditRecord(repair, index));
  const items = repairs.map((repair, index) =>
    toReviewItem(repair, auditTrail[index], index),
  );
  const unresolvedCount = items.filter((item) => item.requiresReview).length;
  const confidenceSummary = createConfidenceSummary(items);

  return {
    state: unresolvedCount > 0 ? "review_required" : "ready",
    confidence: overallConfidence(items),
    summary:
      unresolvedCount > 0
        ? `Có ${unresolvedCount} thay đổi cần người dùng review trước khi tiếp tục.`
        : "Không có thay đổi nhạy cảm hoặc mơ hồ cần review.",
    confidenceSummary,
    unresolvedCount,
    items,
    auditTrail,
    stagedStudents: students,
  };
}
