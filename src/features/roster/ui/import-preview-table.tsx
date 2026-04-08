import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";

interface ImportPreviewTableProps {
  students: CanonicalStudentRecord[];
}

export function ImportPreviewTable({ students }: ImportPreviewTableProps) {
  const showNoteColumn = students.some((student) => Boolean(student.canonical.note));

  return (
    <section className="panel-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label">Preview dữ liệu chuẩn hóa</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Bảng học viên hợp lệ
          </h2>
        </div>
        <span className="status-badge status-badge--success">
          {students.length} dòng hợp lệ
        </span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-[var(--text-secondary)]">
              <th className="px-3 py-2 font-semibold">Lớp</th>
              <th className="px-3 py-2 font-semibold">MSHV</th>
              <th className="px-3 py-2 font-semibold">Họ tên</th>
              <th className="px-3 py-2 font-semibold">Ngày sinh</th>
              <th className="px-3 py-2 font-semibold">Nơi sinh</th>
              {showNoteColumn ? (
                <th className="px-3 py-2 font-semibold">GHI CHÚ</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={`${student.canonical.studentCode}-${student.rowIndex}`}
                className="rounded-2xl bg-white/75 text-[var(--text-primary)] shadow-[0_8px_24px_rgba(78,61,40,0.05)]"
              >
                <td className="rounded-l-2xl px-3 py-3">
                  {student.canonical.className}
                </td>
                <td className="px-3 py-3 font-semibold">
                  {student.canonical.studentCode}
                </td>
                <td className="px-3 py-3">{student.canonical.fullName}</td>
                <td className="px-3 py-3">{student.canonical.birthDateIso}</td>
                <td className="px-3 py-3">{student.canonical.birthPlace}</td>
                {showNoteColumn ? (
                  <td className="rounded-r-2xl px-3 py-3">
                    {student.canonical.note ?? "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
