import type { AllocationWarning } from "../domain/allocation-types";
import type { ImportIssue } from "@/features/roster/domain/import-issue";

export interface IntakeReviewWarning {
  severity: "warning" | "info";
  code: string;
  message: string;
  row?: number;
  fieldKey?: string;
}

type ReviewIssue = AllocationWarning | ImportIssue | IntakeReviewWarning;

interface AllocationWarningPanelProps {
  title?: string;
  description?: string;
  issues: ReviewIssue[];
}

const severityLabel = {
  blocking: "blocking",
  warning: "warning",
  info: "info",
} as const;

const severityClass = {
  blocking: "status-badge--danger",
  warning: "status-badge--warning",
  info: "status-badge--info",
} as const;

export function AllocationWarningPanel({
  title = "Warning panel",
  description = "Các warning và blocking issues quan trọng sẽ xuất hiện tại đây.",
  issues,
}: AllocationWarningPanelProps) {
  const groups = {
    blocking: issues.filter((issue) => issue.severity === "blocking"),
    warning: issues.filter((issue) => issue.severity === "warning"),
    info: issues.filter((issue) => issue.severity === "info"),
  };
  const hasIssues = issues.length > 0;

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Review warnings</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-badge status-badge--danger">
            blocking {groups.blocking.length}
          </span>
          <span className="status-badge status-badge--warning">
            warning {groups.warning.length}
          </span>
          <span className="status-badge status-badge--info">
            info {groups.info.length}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>

      {hasIssues ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {(Object.keys(groups) as Array<keyof typeof groups>).map((severity) => (
            <div key={severity} className="soft-panel">
              <div className="flex items-center justify-between gap-3">
                <p className="field-label">{severityLabel[severity]}</p>
                <span className={`status-badge ${severityClass[severity]}`}>
                  {groups[severity].length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {groups[severity].length > 0 ? (
                  groups[severity].map((issue) => (
                    <article
                      key={`${severity}-${issue.code}-${issue.message}`}
                      className="rounded-2xl border border-[var(--border-soft)] bg-white/80 p-3"
                    >
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {issue.message}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {issue.code}
                      </p>
                      {"roomNumber" in issue && issue.roomNumber ? (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          room {issue.roomNumber}
                        </p>
                      ) : null}
                      {"row" in issue && issue.row ? (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          row {issue.row}
                        </p>
                      ) : null}
                      {"fieldKey" in issue && issue.fieldKey ? (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          field {issue.fieldKey}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="empty-slot">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Không có mục nào ở nhóm này.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-slot mt-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Chưa có warning hoặc blocking issues nào.
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Nếu import hoặc allocation phát sinh vấn đề, panel này sẽ giữ chúng hiển thị xuyên suốt review.
          </p>
        </div>
      )}
    </section>
  );
}
