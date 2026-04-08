import type { ReviewSummary } from "../domain/allocation-types";

interface AllocationFairnessMatrixProps {
  summary: ReviewSummary;
}

export function AllocationFairnessMatrix({
  summary,
}: AllocationFairnessMatrixProps) {
  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Fairness matrix</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Đọc nhanh fairness và classDistribution
          </h2>
        </div>
        <span className="status-badge status-badge--info">
          Độ lệch sĩ số {summary.sizeSpread}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {summary.roomSizeBuckets.map((bucket) => (
          <span
            key={`${bucket.size}-${bucket.roomNumbers.join("-")}`}
            className="status-badge status-badge--neutral"
          >
            {bucket.size} SV: phòng {bucket.roomNumbers.join(", ")}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="soft-panel overflow-x-auto">
          <p className="field-label">Theo phòng</p>
          <table className="mt-4 min-w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-2 py-2">Phòng</th>
                <th className="px-2 py-2">Sĩ số</th>
                <th className="px-2 py-2">Dominant</th>
                <th className="px-2 py-2">Chi tiết lớp</th>
              </tr>
            </thead>
            <tbody>
              {summary.roomClassBreakdown.map((room) => (
                <tr key={room.roomNumber} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3 font-semibold">P{String(room.roomNumber).padStart(2, "0")}</td>
                  <td className="px-2 py-3">{room.studentCount}</td>
                  <td className="px-2 py-3">
                    {room.dominantClassName
                      ? `${room.dominantClassName} (${room.dominantClassPercentage}%)`
                      : "Không có"}
                  </td>
                  <td className="px-2 py-3">
                    {room.classes.map((entry) => `${entry.className}: ${entry.count}`).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="soft-panel overflow-x-auto">
          <p className="field-label">Theo lớp</p>
          <table className="mt-4 min-w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-2 py-2">Lớp</th>
                <th className="px-2 py-2">Coverage</th>
                <th className="px-2 py-2">Dominant room</th>
                <th className="px-2 py-2">classDistribution</th>
              </tr>
            </thead>
            <tbody>
              {summary.classDistribution.map((entry) => (
                <tr key={entry.className} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3 font-semibold">{entry.className}</td>
                  <td className="px-2 py-3">{entry.roomCoverage} phòng</td>
                  <td className="px-2 py-3">
                    {entry.dominantRoomNumber
                      ? `P${String(entry.dominantRoomNumber).padStart(2, "0")} (${entry.dominantRoomSharePercent}%)`
                      : "Không có"}
                  </td>
                  <td className="px-2 py-3">
                    {entry.rooms
                      .map(
                        (room) =>
                          `P${String(room.roomNumber).padStart(2, "0")}: ${room.count} (${room.percentageOfClass}%)`,
                      )
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
