import type { AllocationOutputRow } from "../domain/allocation-types";

interface PrintRoomViewProps {
  roomNumber: number;
  rows: AllocationOutputRow[];
  sourceFileName: string;
  generatedAt: string;
}

export function PrintRoomView({
  roomNumber,
  rows,
  sourceFileName,
  generatedAt,
}: PrintRoomViewProps) {
  const formattedGeneratedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(generatedAt));

  return (
    <section className="panel-card print-room-section">
      <div className="print-room-header">
        <div>
          <p className="section-label">Danh sách phòng thi</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
            Phòng {roomNumber}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            In từ saved run authoritative của file <strong>{sourceFileName}</strong>.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="soft-panel">
            <p className="field-label">Số thí sinh</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {rows.length}
            </p>
          </div>
          <div className="soft-panel">
            <p className="field-label">Phòng thi</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              Phòng {roomNumber}
            </p>
          </div>
          <div className="soft-panel">
            <p className="field-label">Cập nhật lúc</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {formattedGeneratedAt}
            </p>
          </div>
        </div>
      </div>

      <p className="print-only mt-6 text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">
        authoritative print view
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="print-room-table min-w-full text-left text-sm">
          <thead>
            <tr>
              <th>Phòng thi</th>
              <th>Số báo danh</th>
              <th>Thứ tự trong phòng</th>
              <th>Lớp</th>
              <th>MSHV</th>
              <th>Họ tên</th>
              <th>Ngày sinh</th>
              <th>Nơi sinh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.candidateNumber}>
                <td>{row.roomLabel}</td>
                <td>{row.candidateNumber}</td>
                <td>{row.seatIndex}</td>
                <td>{row.className}</td>
                <td>{row.studentCode}</td>
                <td>{row.fullName}</td>
                <td>{row.birthDateIso}</td>
                <td>{row.birthPlace}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
