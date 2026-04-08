interface AllocationSaveBarProps {
  dirty: boolean;
  blockingIssueCount: number;
  warningIssueCount: number;
  isSaving: boolean;
  saveError: string | null;
  saveErrorKind: "stale" | "validation" | "generic" | null;
  onSave: () => void;
  onReset: () => void;
}

export function AllocationSaveBar({
  dirty,
  blockingIssueCount,
  warningIssueCount,
  isSaving,
  saveError,
  saveErrorKind,
  onSave,
  onReset,
}: AllocationSaveBarProps) {
  const saveDisabled = !dirty || blockingIssueCount > 0 || isSaving;

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Save draft</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Lưu chỉnh sửa về authoritative preview
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`status-badge ${
              dirty ? "status-badge--warning" : "status-badge--success"
            }`}
          >
            {dirty ? "draft" : "authoritative"}
          </span>
          <span className="status-badge status-badge--danger">
            blocking {blockingIssueCount}
          </span>
          <span className="status-badge status-badge--warning">
            warning {warningIssueCount}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Đang lưu..." : "Lưu chỉnh sửa"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
        >
          Đặt lại
        </button>
      </div>

      <div className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        {blockingIssueCount > 0
          ? "Save bị khóa khi draft còn blockingIssues.length > 0."
          : dirty
            ? "Draft đang khác authoritative preview. Khi save thành công, workspace sẽ hydrate lại từ response PATCH."
            : "Draft hiện trùng với authoritative preview."}
      </div>

      {saveError ? (
        <div className="soft-panel mt-4">
          <p className="field-label">
            {saveErrorKind === "stale"
              ? "Stale conflict"
              : saveErrorKind === "validation"
                ? "Validation failure"
                : "Persistence error"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {saveError}
          </p>
        </div>
      ) : null}
    </section>
  );
}
