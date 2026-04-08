"use client";

import { useMemo, useState } from "react";

import type {
  IntakeAuditRecord,
  IntakeConfidenceBand,
} from "@/features/roster/domain/intake-review";
import type { ImportResultPayload } from "./import-state";

interface IntakeReviewPanelProps {
  importResult: ImportResultPayload;
  onResolved: (result: ImportResultPayload) => void;
}

const CONFIDENCE_ORDER: IntakeConfidenceBand[] = ["high", "medium", "low"];

function isSensitiveField(fieldKey: string): boolean {
  return fieldKey === "studentCode" || fieldKey === "className";
}

function toAuditMap(auditTrail: IntakeAuditRecord[]) {
  return new Map(auditTrail.map((record) => [record.id, record]));
}

export function IntakeReviewPanel({ importResult, onResolved }: IntakeReviewPanelProps) {
  const baseReview = importResult.review;
  const [confirmedItemIds, setConfirmedItemIds] = useState<string[]>([]);
  const auditTrail = baseReview?.auditTrail ?? baseReview?.audit ?? [];
  const stagedStudents = baseReview?.stagedStudents ?? importResult.students;
  const auditById = useMemo(() => toAuditMap(auditTrail), [auditTrail]);
  const groups = useMemo(
    () =>
      CONFIDENCE_ORDER.map((confidence) => ({
        confidence,
        items: baseReview?.items.filter((item) => item.confidence === confidence) ?? [],
      })),
    [baseReview],
  );

  if (!baseReview) {
    return null;
  }

  const requiredConfirmationIds = baseReview.items
    .filter((item) => isSensitiveField(item.fieldKey) || item.requiresReview || item.sensitive)
    .map((item) => item.id);
  const unresolvedManualCount = requiredConfirmationIds.filter(
    (id) => !confirmedItemIds.includes(id),
  ).length;
  const review = {
    ...baseReview,
    unresolvedCount: unresolvedManualCount,
  };

  function toggleConfirmation(itemId: string) {
    setConfirmedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((candidateId) => candidateId !== itemId)
        : [...current, itemId],
    );
  }

  function handleContinue() {
    onResolved({
      ...importResult,
      intakeState: "ready",
      requiresReview: false,
      review: {
        ...review,
        unresolvedCount: 0,
        stagedStudents,
        auditTrail,
      },
      students: stagedStudents,
    });
  }

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Smart Intake review workspace</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Xác nhận các đề xuất trước khi phân phòng
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-badge status-badge--warning">review_required</span>
          <span className="status-badge status-badge--info">
            unresolved {review.unresolvedCount}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{review.summary}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="soft-panel">
          <p className="field-label">High confidence</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {review.confidenceSummary?.high ?? groups[0].items.length}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Medium confidence</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {review.confidenceSummary?.medium ?? groups[1].items.length}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Low confidence</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {review.confidenceSummary?.low ?? groups[2].items.length}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Học viên staged</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {stagedStudents.length}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {groups.map(({ confidence, items }) => (
          <section key={confidence} className="soft-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="field-label capitalize">{confidence} confidence</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {items.length} đề xuất trong nhóm này.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {items.length > 0 ? (
                items.map((item) => {
                  const auditRecord = auditById.get(item.id);
                  const needsManualConfirmation =
                    isSensitiveField(item.fieldKey) || item.requiresReview || item.sensitive;
                  const isConfirmed = confirmedItemIds.includes(item.id);

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[var(--border-soft)] bg-white/90 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[var(--text-primary)]">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            {item.fieldKey}
                            {isSensitiveField(item.fieldKey) ? " · sensitive" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="status-badge status-badge--info">{item.source}</span>
                          <span className="status-badge status-badge--warning">
                            {item.confidence}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="soft-panel">
                          <p className="field-label">rawValue</p>
                          <p className="mt-2 text-sm text-[var(--text-primary)]">
                            {auditRecord?.rawValue ?? item.currentValue ?? "(trống)"}
                          </p>
                        </div>
                        <div className="soft-panel">
                          <p className="field-label">proposedValue</p>
                          <p className="mt-2 text-sm text-[var(--text-primary)]">
                            {auditRecord?.proposedValue ?? item.proposedValue ?? "(trống)"}
                          </p>
                        </div>
                        <div className="soft-panel">
                          <p className="field-label">source</p>
                          <p className="mt-2 text-sm text-[var(--text-primary)]">
                            {auditRecord?.decisionSource ?? item.source}
                          </p>
                        </div>
                        <div className="soft-panel">
                          <p className="field-label">confidence</p>
                          <p className="mt-2 text-sm text-[var(--text-primary)]">
                            {auditRecord?.confidence ?? item.confidence}
                          </p>
                        </div>
                        <div className="soft-panel">
                          <p className="field-label">reasoning</p>
                          <p className="mt-2 text-sm text-[var(--text-primary)]">
                            {auditRecord?.reason ?? item.reason}
                          </p>
                        </div>
                      </div>

                      {needsManualConfirmation ? (
                        <label className="mt-4 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                          <input
                            checked={isConfirmed}
                            onChange={() => toggleConfirmation(item.id)}
                            type="checkbox"
                          />
                          Tôi xác nhận đề xuất cho
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.fieldKey === "studentCode"
                              ? "studentCode"
                              : item.fieldKey === "className"
                                ? "className"
                                : item.fieldKey}
                          </span>
                        </label>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="empty-slot">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Không có mục nào trong nhóm confidence này.
                  </p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-soft)] bg-white/70 p-4">
        <div>
          <p className="field-label">Sẵn sàng sang phân phòng</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Sensitive-field proposals như studentCode và className phải được xác nhận thủ công trước khi workspace promote payload này sang luồng ready.
          </p>
        </div>
        <button
          type="button"
          disabled={review.unresolvedCount > 0}
          onClick={handleContinue}
          className="rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Tiếp tục sang phân phòng
        </button>
      </div>
    </section>
  );
}
