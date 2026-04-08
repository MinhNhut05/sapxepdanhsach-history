import type {
  AllocationRoomResult,
  ReviewSummary,
} from "../domain/allocation-types";

interface AllocationRoomTableProps {
  rooms: AllocationRoomResult[];
  summary?: ReviewSummary;
  title?: string;
  label?: string;
}

export function AllocationRoomTable({
  rooms,
  summary,
  title = "Danh sách học viên",
  label = "Room preview",
}: AllocationRoomTableProps) {
  return (
    <div className="grid gap-6">
      {rooms.map((room) => (
        <section key={room.roomNumber} className="panel-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-label">
                {label} · Phòng {room.roomNumber}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="status-badge status-badge--success">
                {room.students.length}/{room.capacity} chỗ
              </span>
              <span className="status-badge status-badge--neutral">
                roomNumber {room.roomNumber}
              </span>
            </div>
          </div>

          {summary ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="soft-panel">
                <p className="field-label">Thứ tự phòng</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  P{String(room.roomNumber).padStart(2, "0")}
                </p>
              </div>
              <div className="soft-panel">
                <p className="field-label">Dominant class</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {summary.roomClassBreakdown.find(
                    (breakdown) => breakdown.roomNumber === room.roomNumber,
                  )?.dominantClassName ?? "Không có"}
                </p>
              </div>
              <div className="soft-panel">
                <p className="field-label">Room-level warning</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {summary.sizeSpread > 1 && room.students.length === summary.maxRoomSize
                    ? "Sĩ số đang cao nhất"
                    : summary.sizeSpread > 1 &&
                        room.students.length === summary.minRoomSize
                      ? "Sĩ số đang thấp nhất"
                      : "Không có"}
                </p>
              </div>
            </div>
          ) : null}

          {summary ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.roomClassBreakdown
                .find((breakdown) => breakdown.roomNumber === room.roomNumber)
                ?.classes.map((entry) => (
                  <span
                    key={`${room.roomNumber}-${entry.className}`}
                    className="status-badge status-badge--info"
                  >
                    {entry.className}: {entry.count} ({entry.percentageOfRoom}%)
                  </span>
                ))}
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-[var(--text-secondary)]">
                  <th className="px-3 py-2 font-semibold">Phòng</th>
                  <th className="px-3 py-2 font-semibold">SBD</th>
                  <th className="px-3 py-2 font-semibold">Thứ tự</th>
                  <th className="px-3 py-2 font-semibold">Lớp</th>
                  <th className="px-3 py-2 font-semibold">MSHV</th>
                  <th className="px-3 py-2 font-semibold">Họ tên</th>
                </tr>
              </thead>
              <tbody>
                {room.students.map((student) => (
                  <tr
                    key={student.candidateNumber}
                    className="bg-white/75 text-[var(--text-primary)] shadow-[0_8px_24px_rgba(78,61,40,0.05)]"
                  >
                    <td className="rounded-l-2xl px-3 py-3 font-semibold">
                      P{String(room.roomNumber).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {student.candidateNumber}
                    </td>
                    <td className="px-3 py-3">{student.seatIndex}</td>
                    <td className="px-3 py-3">{student.canonical.className}</td>
                    <td className="px-3 py-3">{student.canonical.studentCode}</td>
                    <td className="rounded-r-2xl px-3 py-3">
                      {student.canonical.fullName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
