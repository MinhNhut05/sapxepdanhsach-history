import type {
  AllocationHistoryItem,
  AllocationRetentionPolicy,
  AllocationStrategyKey,
} from "../domain/allocation-types";

interface AllocationHistoryPanelProps {
  runs: AllocationHistoryItem[];
  retention: AllocationRetentionPolicy | null;
  isLoading: boolean;
  error: string | null;
  reopeningRunId: string | null;
  activeRunId: string | null;
  onReopenRun: (runId: string) => void;
}

const strategyLabels: Record<AllocationStrategyKey, string> = {
  even_mix: "Trộn đều",
  class_grouped: "Gom theo lớp",
  representative_ratio: "Tỷ lệ đại diện",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "Chưa có chỉnh sửa";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AllocationHistoryPanel({
  runs,
  retention,
  isLoading,
  error,
  reopeningRunId,
  activeRunId,
  onReopenRun,
}: AllocationHistoryPanelProps) {
  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Lịch sử phân phòng</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Reopen saved runs từ homepage
          </h2>
        </div>
        <div className="soft-panel max-w-md">
          <p className="field-label">Chính sách retention</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {retention
              ? `Saved run chỉ còn hiệu lực ${retention.days} ngày kể từ lần cập nhật gần nhất.`
              : "Retention policy đang được tải từ server."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-slot mt-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Đang tải lịch sử saved run...
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="empty-slot mt-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">{error}</p>
        </div>
      ) : null}

      {!isLoading && !error && runs.length === 0 ? (
        <div className="empty-slot mt-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Chưa có saved run nào còn trong retention window.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && runs.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {runs.map((run) => (
            <article
              key={run.id}
              className={`soft-panel ${
                activeRunId === run.id ? "ring-2 ring-[var(--accent-strong)]/20" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="field-label">{run.sourceFileName}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {strategyLabels[run.strategy]}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Tạo lúc {formatDate(run.createdAt)} · {run.roomCount} phòng ·{" "}
                    {run.totalStudents} học viên
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    Lần sửa cuối: {formatDate(run.lastEditedAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`status-badge ${
                      run.isEdited ? "status-badge--warning" : "status-badge--info"
                    }`}
                  >
                    {run.isEdited ? "Đã chỉnh sửa" : "Auto-allocation"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onReopenRun(run.id)}
                    disabled={reopeningRunId === run.id}
                    className="rounded-2xl bg-[var(--text-primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reopeningRunId === run.id ? "Đang mở..." : "Mở lại"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
