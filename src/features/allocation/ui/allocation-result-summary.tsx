import type { EditableAllocationRun } from "../domain/allocation-types";

interface AllocationResultSummaryProps {
  run: EditableAllocationRun;
}

const strategyLabels = {
  even_mix: "Trộn đều",
  class_grouped: "Gom theo lớp",
  representative_ratio: "Tỷ lệ đại diện",
} as const;

export function AllocationResultSummary({ run }: AllocationResultSummaryProps) {
  const createdAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(run.createdAt));
  const editedAt = run.lastEditedAt
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(run.lastEditedAt))
    : null;

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Kết quả đã lưu</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Tóm tắt lần phân phòng
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-badge status-badge--success">
            {strategyLabels[run.strategy]}
          </span>
          <span
            className={`status-badge ${
              run.isEdited ? "status-badge--warning" : "status-badge--info"
            }`}
          >
            {run.isEdited ? "Edited snapshot" : "Original auto-allocation"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="soft-panel">
          <p className="field-label">Số học viên</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {run.summary.totalStudents}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Số phòng</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {run.roomCount}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Độ lệch sĩ số</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {run.summary.sizeSpread}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Lưu lúc</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {createdAt}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Edit version</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {run.editVersion}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Mã lần chạy</p>
          <p className="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">
            {run.id}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="soft-panel">
          <p className="field-label">Trạng thái preview</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {run.isEdited
              ? "Preview hiện tại đang dùng snapshot đã lưu sau chỉnh sửa. Kết quả export/print về sau phải bám theo trạng thái này."
              : "Preview hiện tại vẫn là snapshot auto-allocation gốc. Bạn có thể chuyển sang edit mode để tạo draft trước khi lưu."}
          </p>
        </div>
        <div className="soft-panel">
          <p className="field-label">Lần chỉnh sửa gần nhất</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {editedAt ?? "Chưa có chỉnh sửa nào được lưu"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {run.summary.roomSizeBuckets.map((bucket) => (
          <span
            key={`${bucket.size}-${bucket.roomNumbers.join("-")}`}
            className="status-badge status-badge--info"
          >
            {bucket.size} SV x {bucket.roomCount} phòng
          </span>
        ))}
      </div>
    </section>
  );
}
