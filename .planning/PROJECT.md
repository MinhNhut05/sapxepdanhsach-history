# ExamRoomAllocator

## What This Is

Ứng dụng web phân phòng thi cho học viên. Người dùng upload roster từ các file spreadsheet như `.xlsx`, `.xls`, hoặc `.csv`, chọn phương án phân phòng, xem preview/chỉnh sửa kết quả, rồi xuất file Excel hoặc in danh sách từng phòng. Phục vụ nhân sự đào tạo — cán bộ khảo thí/văn phòng cần thao tác nhanh, ít lỗi.

## Core Value

Phân phòng thi chính xác, công bằng, và xuất kết quả dùng được ngay (Excel + in) — không lỗi font, không lệch cột, sắp xếp tiếng Việt chuẩn.

## Current Milestone: v1.1 Smart Intake

**Goal:** Làm intake roster chịu lỗi tốt với file Excel/CSV bẩn nhưng vẫn giữ các sửa đổi có kiểm soát, có review, và không làm hỏng luồng allocation hiện có.

**Target features:**
- Fast path cho file sạch, review path cho file bẩn trong cùng một intake flow
- Hỗ trợ `.xlsx`, `.xls`, `.csv` với header/layout/date format kém chuẩn
- Audit trail cho mọi sửa đổi do rule hoặc AI đề xuất
- AI-assisted mapping/repair với fallback sang rule-based review khi provider lỗi hoặc hết quota

## Requirements

### Validated

- [x] Upload file Excel (.xlsx) và đọc đúng cấu trúc (Lớp, MSHV, HỌ LÓT, TÊN, NGÀY SINH, NƠI SINH, GHI CHÚ tùy chọn)
- [x] Chuẩn hóa sắp xếp tiếng Việt (không sort ASCII đơn thuần)
- [x] Xử lý linh hoạt cột GHI CHÚ có hoặc không có trong file upload
- [x] 3 phương án phân phòng: trộn đều, giữ tương đối theo lớp, phân bổ tỉ lệ đại diện
- [x] Sắp xếp theo TÊN (tiếng Việt chuẩn), tie-break bằng HỌ LÓT rồi MSHV
- [x] Đánh số báo danh theo format Pxx-yyy (phòng + thứ tự)
- [x] Thuật toán cân bằng phòng trước, giữ lớp trong mức cho phép
- [x] Lưu lịch sử các lần phân phòng vào DB (PostgreSQL)
- [x] Preview kết quả phân phòng trước khi xuất với saved-run review dashboard
- [x] Chỉnh sửa thủ công sau phân tự động (chuyển phòng, đổi thứ tự, tái sinh SBD theo vị trí mới)
- [x] Drag & drop học viên giữa các phòng trên giao diện
- [x] Dashboard thống kê: số HV/phòng, phân bổ lớp, warning/fairness matrix
- [x] Lưu chỉnh sửa thủ công và đồng bộ authoritative preview cho các phase output sau
- [x] Xuất file Excel: 1 sheet tổng + mỗi phòng 1 sheet riêng
- [x] In print-friendly danh sách từng phòng ngay trên web
- [x] Mở lại saved run đã lưu để xem lại/tiếp tục thao tác

### Active

- [ ] Smart intake cho `.xlsx`, `.xls`, `.csv` với layout/header không sạch và dữ liệu hơi lệch chuẩn
- [ ] Confidence-based review: file sạch đi nhanh, file bẩn vào review workspace trước khi allocation
- [ ] Audit trail lưu raw value, proposed value, nguồn quyết định (rule/AI), confidence, và lý do ngắn
- [ ] AI-assisted repair dùng secret server-side, không lộ key trên UI, và vẫn có fallback không-AI khi provider lỗi

### Out of Scope

- Authentication/login — v1 public, không cần auth
- Multi-tenant (nhiều tổ chức) — v1 phục vụ 1 đơn vị
- Real-time collaboration — 1 người dùng tại 1 thời điểm
- Mobile app — web responsive là đủ
- PDF export — v1 dùng print-friendly HTML, PDF có thể v2

## Context

- File mẫu K19A.xlsx: 272 học viên, 7 lớp, 6 cột (không có GHI CHÚ)
- Cần chia vào 13 phòng thi (số phòng có thể thay đổi theo input)
- Người dùng chính: cán bộ khảo thí/văn phòng đào tạo — ưu tiên UX đơn giản, ít bước
- Đây là công cụ nội bộ nhưng deploy public để truy cập dễ dàng
- Tiếng Việt là ngôn ngữ chính — font, sort, hiển thị phải chuẩn tiếng Việt
- Ứng dụng cần chạy ổn định end-to-end: upload → chọn phương án → preview → chỉnh sửa → xuất/in
- Dữ liệu đầu vào thực tế có thể đến từ nhiều nguồn export tay, tiêu đề cột lệch nhẹ, có dòng tiêu đề phụ, khoảng trắng dư, encoding CSV khác nhau, hoặc ngày sinh nhập không đồng nhất
- Clean file vẫn phải đi qua fast path hiện có; smart intake không được phá vỡ allocation/review/export flow đã ổn định

## Constraints

- **Tech stack**: Next.js fullstack (App Router) + TypeScript — deploy Vercel
- **Database**: PostgreSQL + Prisma ORM — managed DB (Neon/Supabase)
- **Clean code**: Pragmatic clean — tách rõ domain/service/controller, naming rõ ràng, không over-engineer
- **Language**: UI tiếng Việt, code tiếng Anh
- **File format**: Intake cần đi được `.xlsx`, `.xls`, `.csv`; export vẫn giữ `.xlsx` chất lượng cao
- **Vietnamese sort**: Cần thư viện hoặc custom collation hỗ trợ sắp xếp tiếng Việt chuẩn
- **Deploy**: Vercel (Next.js native), DB qua Neon hoặc Supabase PostgreSQL
- **Public access**: Không auth ở v1, ai có link đều truy cập được
- **AI secrets**: API key và provider config chỉ tồn tại ở server/env — không có màn nhập key trên UI
- **Safety**: `MSHV` và `Lớp` là field nhạy cảm — không được auto-correct âm thầm
- **Reliability**: Nếu AI unavailable thì người dùng vẫn phải intake được bằng rule-based + review

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
| Smart intake dùng fast path + review path | File sạch phải vào allocation ngay, file bẩn mới trả giá UX bằng review | — Pending |
| Confidence model 3 mức | Cần đủ tín hiệu để auto-apply, suggest, hoặc yêu cầu review mà không phức tạp quá mức | — Pending |
| AI provider config server-side, provider-agnostic | Giữ secret khỏi UI và tránh khóa cứng hệ thống vào một vendor ngay từ phase đầu | — Pending |
| Smart Intake Core có thể tách governance sâu sang Phase 6 | Giữ Phase 5 ship được trong khi vẫn mở đường cho metrics/admin/tuning về sau | — Pending |

## Current State

Phase 4 is complete. The app already supports guarded roster import, deterministic allocation, authoritative review/editing, workbook export, print views, and reopening saved runs. Phase 5 is now defined as the next milestone slice for resilient smart intake without rewriting the allocation/output core.

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
*Last updated: 2026-04-08 after Phase 5 definition*
