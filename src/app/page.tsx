import { UploadPanel } from "@/features/roster/ui/upload-panel";

const checkpoints = [
  "Tải roster .xlsx từ phòng đào tạo",
  "Chuẩn hóa tiếng Việt và ngày sinh trên server",
  "Trả về preview cùng lỗi theo từng dòng dữ liệu",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="panel-card overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <span className="status-badge status-badge--neutral">
                Phase 1 shell
              </span>
              <span className="status-badge status-badge--success">
                Sẵn sàng nhận file .xlsx
              </span>
            </div>

            <div className="space-y-3">
              <p className="section-label">Không gian nhập dữ liệu</p>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
                ExamRoomAllocator
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                Upload danh sách học viên, kiểm tra cấu trúc bắt buộc, rồi khóa
                kết quả chuẩn hóa trước khi chuyển sang bước phân phòng thi.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {checkpoints.map((checkpoint, index) => (
                <article key={checkpoint} className="soft-panel h-full">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Bước {index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {checkpoint}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="soft-panel flex flex-col gap-4">
            <div>
              <p className="section-label">Phiên làm việc hiện tại</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                Khu vực import đầu vào
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Chấp nhận đúng định dạng `.xlsx` với các cột bắt buộc của roster.
              </p>
              <p>
                Form upload dùng trực tiếp dữ liệu trả về từ API import, không tự
                dựng kết quả kiểm tra ở phía client.
              </p>
            </div>
            <UploadPanel />
          </aside>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="panel-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-label">Preview tương lai</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Khung xem trước dữ liệu chuẩn hóa
              </h2>
            </div>
            <span className="status-badge status-badge--neutral">
              Chưa có dữ liệu
            </span>
          </div>
          <div className="empty-slot mt-6">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Bảng học viên đã chuẩn hóa sẽ hiển thị tại đây
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Khi import thành công, giao diện sẽ dùng cùng một nguồn dữ liệu đã
              được xác thực từ server để giữ preview, sắp xếp, và export nhất quán.
            </p>
          </div>
        </article>

        <article className="panel-card">
          <p className="section-label">Phản hồi kiểm tra dữ liệu</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Khu vực cảnh báo theo dòng
          </h2>
          <div className="mt-6 space-y-3">
            <div className="status-row">
              <span className="status-badge status-badge--danger">blocking</span>
              <p className="text-sm text-[var(--text-secondary)]">
                Lỗi chặn import như thiếu cột hoặc trùng `MSHV`.
              </p>
            </div>
            <div className="status-row">
              <span className="status-badge status-badge--warning">warning</span>
              <p className="text-sm text-[var(--text-secondary)]">
                Cảnh báo cần người dùng xem lại nhưng chưa bắt buộc dừng import.
              </p>
            </div>
            <div className="status-row">
              <span className="status-badge status-badge--info">info</span>
              <p className="text-sm text-[var(--text-secondary)]">
                Ghi nhận các thay đổi chuẩn hóa như trim khoảng trắng hoặc chuẩn hóa
                Unicode tiếng Việt.
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
