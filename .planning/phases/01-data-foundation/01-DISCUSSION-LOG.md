# Phase 1: Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08T11:00:05+07:00
**Phase:** 1-Data Foundation
**Areas discussed:** Độ linh hoạt của file import, Cách xử lý lỗi import, Mức chuẩn hóa dữ liệu chuẩn, Quy tắc dữ liệu trùng hoặc mơ hồ

---

## Độ linh hoạt của file import

| Option | Description | Selected |
|--------|-------------|----------|
| Tên cột bắt buộc: A | Phải khớp chính xác tuyệt đối như spec | |
| Tên cột bắt buộc: B | Cho lệch nhẹ về hoa/thường, khoảng trắng, Unicode; vẫn là cùng tên cột | ✓ |
| Tên cột bắt buộc: C | Cho cả tên cột alias khác nghĩa tương đương | |
| Thứ tự cột: A | Bắt đúng thứ tự chuẩn, có cột lạ là báo lỗi | |
| Thứ tự cột: B | Cho cột bắt buộc ở bất kỳ vị trí nào, bỏ qua cột thừa | ✓ |
| Thứ tự cột: C | Cho cột bất kỳ và tự cố đoán map nếu thiếu tên rõ ràng | |
| Sheet import: A | Chỉ đọc sheet đầu tiên | ✓ |
| Sheet import: B | Tự tìm sheet hợp lệ đầu tiên | |
| Sheet import: C | Cho người dùng chọn sheet trước khi import | |
| Header position: A | Bỏ qua dòng trống, nhưng hàng phụ ngoài header chuẩn là lỗi | |
| Header position: B | Tự bỏ qua vài hàng đầu không hợp lệ trước khi gặp header | |
| Header position: C | Chỉ chấp nhận header ở dòng đầu tiên, lệch là lỗi | ✓ |

**User's choice:** B, B, A, C
**Notes:** Import should be flexible for harmless header formatting differences and column order, but not permissive enough to guess schema or tolerate shifted headers.

---

## Cách xử lý lỗi import

| Option | Description | Selected |
|--------|-------------|----------|
| Import on row errors: A | Chặn toàn bộ import cho tới khi sửa hết lỗi blocking | ✓ |
| Import on row errors: B | Vẫn import các dòng hợp lệ, tách riêng dòng lỗi | |
| Import on row errors: C | Cho người dùng chọn import một phần hay không | |
| Error detail: A | Chỉ báo số dòng có lỗi và loại lỗi tổng quát | |
| Error detail: B | Báo theo từng dòng, từng cột, kèm giá trị lỗi nếu an toàn | ✓ |
| Error detail: C | Báo theo từng dòng nhưng không nêu cột cụ thể | |
| Severity model: A | Không phân cấp lỗi | |
| Severity model: B | `blocking` và `warning` | |
| Severity model: C | `blocking`, `warning`, và `info` | ✓ |
| Error UI: A | Một bảng lỗi tập trung để người dùng rà và sửa file nguồn | ✓ |
| Error UI: B | Highlight ngay trên preview dữ liệu đã parse | |
| Error UI: C | Cả hai ngay từ đầu | |
| Info usage: A | Chỉ cho thông tin cleanup không ảnh hưởng tính hợp lệ | ✓ |
| Info usage: B | Cho cả dữ liệu hơi đáng ngờ nhưng vẫn cho qua | |
| Info usage: C | Chỉ log nội bộ | |
| No blocking: A | Vẫn cho import tiếp, nhưng hiển thị cả `warning` và `info` rõ ràng | ✓ |
| No blocking: B | Bắt xác nhận rồi mới import | |
| No blocking: C | Tự import, chỉ lưu log | |

**User's choice:** A, B, C, A, A, A
**Notes:** Import must remain trustworthy. The user wants fast correction in one pass with rich diagnostics, while still allowing non-blocking cleanup and advisory messages.

---

## Mức chuẩn hóa dữ liệu chuẩn

| Option | Description | Selected |
|--------|-------------|----------|
| Name normalization: A | Chỉ chuẩn hóa Unicode và trim khoảng trắng; giữ nguyên cách viết gốc | |
| Name normalization: B | Chuẩn hóa Unicode, trim, gộp khoảng trắng thừa, và chuẩn hóa hoa/thường theo kiểu hiển thị chuẩn | ✓ |
| Name normalization: C | Cố sửa đẹp mạnh hơn, ví dụ suy đoán lỗi chính tả phổ biến | |
| Raw + canonical: A | Giữ cả raw value và canonical value | ✓ |
| Raw + canonical: B | Chỉ lưu giá trị sau chuẩn hóa | |
| Raw + canonical: C | Chỉ giữ raw cho vài cột nhạy cảm | |
| Text date parsing: A | Chỉ nhận Excel date cell và một format text chuẩn | |
| Text date parsing: B | Nhận Excel date cell và một số format text phổ biến nội bộ | |
| Text date parsing: C | Cố parse rộng cho các format nhìn giống ngày | ✓ |
| Normalization feedback: A | Im lặng dùng canonical | |
| Normalization feedback: B | Import được, nhưng ghi `info` rõ là hệ thống đã chuẩn hóa | ✓ |
| Normalization feedback: C | Bắt xác nhận từng thay đổi | |
| Name casing follow-up: A | Đưa về Title Case để hiển thị chuẩn, vẫn giữ raw value | ✓ |
| Name casing follow-up: B | Không đổi hoa/thường thực tế | |
| Name casing follow-up: C | Chỉ canonical hóa nội bộ cho sort/search | |
| Ambiguous date follow-up: A | Dùng một quy ước mặc định rồi parse luôn | |
| Ambiguous date follow-up: B | `warning`, vẫn import | |
| Ambiguous date follow-up: C | `blocking`, bắt file phải rõ nghĩa | ✓ |

**User's choice:** B, A, C, B, then delegated follow-up choices to the agent; resolved as A and C.
**Notes:** The user explicitly asked for a web app that is fully usable without unnecessary limitations, so normalization was made practical and broad, but ambiguity that could corrupt official data remains blocking.

---

## Quy tắc dữ liệu trùng hoặc mơ hồ

| Option | Description | Selected |
|--------|-------------|----------|
| Duplicate MSHV: A | `Blocking` ngay, không import | ✓ |
| Duplicate MSHV: B | `Warning`, vẫn import nhưng đánh dấu | |
| Duplicate MSHV: C | Giữ bản ghi đầu tiên, bỏ bản ghi sau | |
| Same name + DOB, different MSHV: A | Vẫn hợp lệ, chỉ gắn `warning` để người dùng tự kiểm | ✓ |
| Same name + DOB, different MSHV: B | `Blocking` | |
| Same name + DOB, different MSHV: C | Im lặng cho qua | |
| Blank row inside data: A | Gặp hàng trống là coi như hết dữ liệu | |
| Blank row inside data: B | Bỏ qua hàng trống ở giữa và tiếp tục đọc | |
| Blank row inside data: C | `Warning`, nhưng vẫn bỏ qua và đọc tiếp | ✓ |
| Missing required field: A | `Blocking` theo từng dòng và chặn toàn file | ✓ |
| Missing required field: B | `Warning`, cho nhập rồi sửa sau | |
| Missing required field: C | Tự điền giá trị rỗng mặc định | |

**User's choice:** Delegated to the agent; resolved using the recommended safe defaults.
**Notes:** Chosen to preserve operational reliability while still tolerating common Excel cleanup issues that should not silently terminate parsing.

---

## the agent's Discretion

- Exact non-ambiguous text date formats to support in code.
- Exact Title Case and Vietnamese-safe normalization implementation details.

## Deferred Ideas

None.
