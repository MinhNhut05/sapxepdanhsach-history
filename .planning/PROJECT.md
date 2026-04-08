# ExamRoomAllocator

## What This Is

Ứng dụng web phân phòng thi cho học viên. Người dùng upload file Excel (.xlsx) chứa danh sách học viên, chọn phương án phân phòng, xem preview/chỉnh sửa kết quả, rồi xuất file Excel hoặc in danh sách từng phòng. Phục vụ nhân sự đào tạo — cán bộ khảo thí/văn phòng cần thao tác nhanh, ít lỗi.

## Core Value

Phân phòng thi chính xác, công bằng, và xuất kết quả dùng được ngay (Excel + in) — không lỗi font, không lệch cột, sắp xếp tiếng Việt chuẩn.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Upload file Excel (.xlsx) và đọc đúng cấu trúc (Lớp, MSHV, HỌ LÓT, TÊN, NGÀY SINH, NƠI SINH, GHI CHÚ tùy chọn)
- [ ] 3 phương án phân phòng: trộn đều, giữ tương đối theo lớp, phân bổ tỉ lệ đại diện
- [ ] Sắp xếp theo TÊN (tiếng Việt chuẩn), tie-break bằng HỌ LÓT rồi MSHV
- [ ] Đánh số báo danh theo format Pxx-yyy (phòng + thứ tự)
- [ ] Thuật toán cân bằng phòng trước, giữ lớp trong mức cho phép
- [ ] Preview kết quả phân phòng trước khi xuất (bảng + biểu đồ phân bổ)
- [ ] Chỉnh sửa thủ công sau phân tự động (chuyển phòng, đổi SBD)
- [ ] Drag & drop học viên giữa các phòng trên giao diện
- [ ] Dashboard thống kê: số HV/phòng, phân bổ lớp, biểu đồ cân bằng
- [ ] Xuất file Excel: 1 sheet tổng + mỗi phòng 1 sheet riêng
- [ ] In print-friendly danh sách từng phòng ngay trên web
- [ ] Lưu lịch sử các lần phân phòng vào DB (PostgreSQL)
- [ ] Chuẩn hóa sắp xếp tiếng Việt (không sort ASCII đơn thuần)
- [ ] Xử lý linh hoạt cột GHI CHÚ có hoặc không có trong file upload

### Out of Scope

- Authentication/login — v1 public, không cần auth
- Multi-tenant (nhiều tổ chức) — v1 phục vụ 1 đơn vị
- Real-time collaboration — 1 người dùng tại 1 thời điểm
- Mobile app — web responsive là đủ
- PDF export — v1 dùng print-friendly HTML, PDF có thể v2
- Import từ CSV — chỉ hỗ trợ .xlsx

## Context

- File mẫu K19A.xlsx: 272 học viên, 7 lớp, 6 cột (không có GHI CHÚ)
- Cần chia vào 13 phòng thi (số phòng có thể thay đổi theo input)
- Người dùng chính: cán bộ khảo thí/văn phòng đào tạo — ưu tiên UX đơn giản, ít bước
- Đây là công cụ nội bộ nhưng deploy public để truy cập dễ dàng
- Tiếng Việt là ngôn ngữ chính — font, sort, hiển thị phải chuẩn tiếng Việt
- Ứng dụng cần chạy ổn định end-to-end: upload → chọn phương án → preview → chỉnh sửa → xuất/in

## Constraints

- **Tech stack**: Next.js fullstack (App Router) + TypeScript — deploy Vercel
- **Database**: PostgreSQL + Prisma ORM — managed DB (Neon/Supabase)
- **Clean code**: Pragmatic clean — tách rõ domain/service/controller, naming rõ ràng, không over-engineer
- **Language**: UI tiếng Việt, code tiếng Anh
- **File format**: Chỉ .xlsx (đọc và xuất), dùng thư viện exceljs hoặc sheetjs
- **Vietnamese sort**: Cần thư viện hoặc custom collation hỗ trợ sắp xếp tiếng Việt chuẩn
- **Deploy**: Vercel (Next.js native), DB qua Neon hoặc Supabase PostgreSQL
- **Public access**: Không auth ở v1, ai có link đều truy cập được

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js fullstack thay vì tách FE/BE | Một repo, deploy đơn giản trên Vercel, API routes đủ cho nghiệp vụ này | — Pending |
| PostgreSQL + Prisma thay vì stateless | Người dùng muốn lưu lịch sử phân phòng, xem lại/so sánh kết quả cũ | — Pending |
| Pragmatic clean thay vì full Clean Architecture | Cân bằng giữa tốc độ ra v1 và nền tảng bền vững, tránh over-engineer cho app nghiệp vụ rõ ràng | — Pending |
| Cân bằng phòng trước khi giữ lớp | Công bằng số lượng mỗi phòng là ưu tiên số 1, giữ lớp là thứ yếu | — Pending |
| Full v1 với 4 features mở rộng | Preview + chỉnh sửa + drag & drop + dashboard đều vào v1, không đẩy sang v2 | — Pending |
| SBD format Pxx-yyy | Dễ đọc, dễ in, gắn rõ phòng + thứ tự, không trùng lặp | — Pending |
| Excel output master + per-room sheets | Tiện lọc tổng + in từng phòng, đáp ứng cả 2 nhu cầu | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after initialization*
