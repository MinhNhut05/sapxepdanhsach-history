import type { ReviewSummary } from "../domain/allocation-types";

interface AllocationFairnessMatrixProps {
  summary: ReviewSummary;
}

function renderStrictFairnessStatus(summary: ReviewSummary) {
  if (!summary.fairnessFeasibility) {
    return null;
  }

  if (summary.fairnessFeasibility.feasible) {
    return (
      <div className="status-badge status-badge--success">
        Strict fairness khả thi: spread từng lớp phải &lt;= 1
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Strict fairness không khả thi</p>
      <p className="mt-1">
        {summary.fairnessFeasibility.reason ??
          "Hệ thống đã dùng fallback deterministic và ghi rõ lý do infeasible."}
      </p>
    </div>
  );
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

      <div className="mt-4 flex flex-col gap-3">
        {renderStrictFairnessStatus(summary)}
        {summary.classSpreadViolations.length > 0 ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">Strict fairness violations</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {summary.classSpreadViolations.map((violation) => (
                <li key={`${violation.className}-${violation.code}`}>
                  {violation.message} (min {violation.actualMinCount}, max {violation.actualMaxCount})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
        <div className="soft-panel app-scroll-region max-h-[24rem] overflow-auto">
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

        <div className="soft-panel app-scroll-region max-h-[24rem] overflow-auto">
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

      {summary.classSpreadByClass.length > 0 ? (
        <div className="soft-panel mt-6 app-scroll-region max-h-[20rem] overflow-auto">
          <p className="field-label">Strict class spread</p>
          <table className="mt-4 min-w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-2 py-2">Lớp</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">Actual spread</th>
                <th className="px-2 py-2">Theo phòng</th>
              </tr>
            </thead>
            <tbody>
              {summary.classSpreadByClass.map((entry) => (
                <tr key={entry.className} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3 font-semibold">{entry.className}</td>
                  <td className="px-2 py-3">
                    {entry.expectedMinPerRoom} - {entry.expectedMaxPerRoom}
                  </td>
                  <td className="px-2 py-3">{entry.spread}</td>
                  <td className="px-2 py-3">
                    {entry.rooms
                      .map((room) => `P${String(room.roomNumber).padStart(2, "0")}: ${room.count}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
