"use client";

export function PrintRoomActions() {
  return (
    <div className="screen-only flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border-soft)] bg-white/85 px-5 py-4">
      <div>
        <p className="section-label">Print controls</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Dùng preview này để in đúng danh sách của một phòng từ authoritative saved run.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          window.print();
        }}
        className="rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(147,95,35,0.18)]"
      >
        In danh sách phòng này
      </button>
    </div>
  );
}
