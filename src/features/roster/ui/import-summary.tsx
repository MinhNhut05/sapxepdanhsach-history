import type { ImportSummaryData } from "./import-state";

interface ImportSummaryProps {
  summary: ImportSummaryData;
}

export function ImportSummary({ summary }: ImportSummaryProps) {
  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Tổng quan import</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Kết quả parse từ server
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-badge status-badge--success">
            {summary.validStudents} hợp lệ
          </span>
          <span className="status-badge status-badge--danger">
            {summary.blockingIssues} blocking
          </span>
          <span className="status-badge status-badge--warning">
            {summary.warningIssues} warning
          </span>
          <span className="status-badge status-badge--info">
            {summary.infoIssues} info
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="soft-panel">
          <p className="field-label">Worksheet</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {summary.worksheetName ?? "Chưa xác định"}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Tổng số dòng đã đọc</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {summary.totalRowsRead}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Số học viên hợp lệ</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {summary.validStudents}
          </p>
        </div>
      </div>
    </section>
  );
}
