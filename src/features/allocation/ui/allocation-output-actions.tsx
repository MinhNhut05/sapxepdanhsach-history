import type { EditableAllocationRun } from "../domain/allocation-types";

interface AllocationOutputActionsProps {
  run: Pick<EditableAllocationRun, "id" | "isEdited" | "rooms">;
}

export function AllocationOutputActions({ run }: AllocationOutputActionsProps) {
  const sortedRooms = [...run.rooms].sort(
    (left, right) => left.roomNumber - right.roomNumber,
  );

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Output actions</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Export và print từ authoritative saved result
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Các liên kết này luôn đọc từ saved run hiện tại trên server, nên Excel
            và print sẽ bám theo authoritative preview{" "}
            {run.isEdited ? "đã chỉnh sửa" : "gốc"}.
          </p>
        </div>
        <a
          href={`/api/allocations/${run.id}/export`}
          className="rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(147,95,35,0.18)]"
        >
          Xuất Excel
        </a>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sortedRooms.map((room) => (
          <a
            key={room.roomNumber}
            href={`/allocations/${run.id}/print?room=${room.roomNumber}`}
            className="soft-panel block text-sm font-semibold text-[var(--text-primary)] no-underline"
          >
            In phòng {room.roomNumber}
          </a>
        ))}
      </div>
    </section>
  );
}
