import type { ImportIssue, ImportIssueSeverity } from "@/features/roster/domain/import-issue";

interface ImportIssuesTableProps {
  issues: ImportIssue[];
}

const severityOrder: ImportIssueSeverity[] = ["blocking", "warning", "info"];

const severityStyles: Record<ImportIssueSeverity, string> = {
  blocking: "status-badge status-badge--danger",
  warning: "status-badge status-badge--warning",
  info: "status-badge status-badge--info",
};

export function ImportIssuesTable({ issues }: ImportIssuesTableProps) {
  const groupedIssues = severityOrder
    .map((severity) => ({
      severity,
      items: issues.filter((issue) => issue.severity === severity),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="panel-card">
      <div>
        <p className="section-label">Bảng lỗi và ghi chú</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Phản hồi theo mức độ ưu tiên
        </h2>
      </div>

      <div className="mt-6 space-y-5">
        {groupedIssues.map((group) => (
          <div key={group.severity} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={severityStyles[group.severity]}>{group.severity}</span>
              <p className="text-sm text-[var(--text-secondary)]">
                {group.items.length} mục
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-[var(--text-secondary)]">
                    <th className="px-3 py-2 font-semibold">Mức độ</th>
                    <th className="px-3 py-2 font-semibold">Dòng</th>
                    <th className="px-3 py-2 font-semibold">Cột</th>
                    <th className="px-3 py-2 font-semibold">Thông điệp</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((issue, index) => (
                    <tr
                      key={`${issue.code}-${issue.row ?? "none"}-${index}`}
                      className="bg-white/75 text-[var(--text-primary)] shadow-[0_8px_24px_rgba(78,61,40,0.05)]"
                    >
                      <td className="rounded-l-2xl px-3 py-3 capitalize">
                        {issue.severity}
                      </td>
                      <td className="px-3 py-3">{issue.row ?? "—"}</td>
                      <td className="px-3 py-3">{issue.column ?? "—"}</td>
                      <td className="rounded-r-2xl px-3 py-3">{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
