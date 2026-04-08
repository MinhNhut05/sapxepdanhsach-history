# Pitfalls Research

**Domain:** Ứng dụng web phân phòng thi / phân bổ học viên (bối cảnh giáo dục Việt Nam)
**Researched:** 2026-04-08
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Sort tên tiếng Việt bằng ASCII/default sort

**What goes wrong:**
Danh sách học viên bị sắp xếp sai thứ tự tên vì dùng `Array.sort()` mặc định, hoặc chỉ sort theo chuỗi nguyên bản. Các tên có dấu tiếng Việt như Â, Ă, Đ, Ê, Ô, Ơ, Ư bị đứng sai vị trí; tie-break theo HỌ LÓT cũng sai; kéo theo preview đúng “cảm giác” nhưng export/in lại không đúng quy ước nghiệp vụ.

**Why it happens:**
Developer assume sort chuỗi là “đủ dùng”, hoặc chỉ test bằng dữ liệu không dấu/ít dấu. JavaScript default sort không hiểu collation (quy tắc sắp xếp theo ngôn ngữ) tiếng Việt.

**How to avoid:**
- Chuẩn hóa rule sort ngay từ domain layer: `TÊN` trước, rồi `HỌ LÓT`, rồi `MSHV`.
- Dùng `Intl.Collator('vi')` thay vì default string compare.
- Normalize Unicode về cùng form (khuyến nghị NFC) trước khi so sánh/lưu.
- Viết test fixture với tên tiếng Việt thật: `Ánh`, `Anh`, `Ân`, `Đạt`, `Dung`, `Dũng`, `Hòa`, `Hoà`, v.v.
- Reuse một comparator duy nhất cho preview, drag/drop reindex, export Excel, và print.

**Warning signs:**
- Cùng một bộ dữ liệu nhưng preview web và file Excel xuất ra khác thứ tự.
- Tên có dấu bị dồn về cuối hoặc đứng lộn xộn.
- Bug report kiểu “sort đúng tiếng Việt chưa?” xuất hiện ngay khi user import file thật.
- QA thấy `Hoà` và `Hòa` xử lý không nhất quán.

**Phase to address:**
Phase nền tảng import/sort domain rules, trước khi làm preview/export.

---

### Pitfall 2: Không normalize Unicode tiếng Việt trước khi so sánh

**What goes wrong:**
Hai chuỗi nhìn giống nhau nhưng hệ thống coi là khác nhau. Ví dụ cùng một tên có thể được nhập dưới dạng precomposed hoặc combining marks; dẫn tới sort sai, detect duplicate sai, filter/search sai, hoặc drag/drop/manual edit tạo dữ liệu “trùng mà không trùng”.

**Why it happens:**
Excel, hệ điều hành, bộ gõ, và nguồn copy-paste có thể tạo các biểu diễn Unicode khác nhau. Developer nhìn UI thấy giống nhau nên nghĩ dữ liệu giống nhau.

**How to avoid:**
- Normalize tất cả text tiếng Việt đầu vào về NFC ngay sau import.
- Normalize trước mọi thao tác compare, dedupe, key generation, và persist DB.
- Giữ raw value riêng chỉ khi thật sự cần audit; còn domain value nên là normalized value.
- Thêm test cho tên giống nhau nhưng khác code point sequence.

**Warning signs:**
- Có record “trùng tên” nhưng không match khi search/filter.
- `===` fail với hai giá trị nhìn giống nhau.
- Số ký tự/tách chuỗi bất thường ở một số tên có dấu.
- Người dùng nói “cùng tên sao hệ thống xem khác người?”.

**Phase to address:**
Phase import pipeline + validation model.

---

### Pitfall 3: Assume file Excel luôn có header/cột cố định tuyệt đối

**What goes wrong:**
Import sai cột khi người dùng đổi tên header nhẹ, thừa dòng trống, thiếu cột `GHI CHÚ`, thêm cột phụ, hoặc đặt hàng tiêu đề không đúng dòng đầu tiên. Kết quả: nhầm `NƠI SINH` thành `GHI CHÚ`, mất dữ liệu, hoặc allocation chạy trên dữ liệu lệch cấu trúc.

**Why it happens:**
Thường chỉ test với 1 file mẫu “đẹp”. Thư viện XLSX parse rất linh hoạt nhưng không tự validate đúng business schema.

**How to avoid:**
- Xây importer theo schema rõ ràng: required columns, optional columns, alias header, trim khoảng trắng.
- Detect header row thay vì assume luôn ở row 1 nếu nghiệp vụ có khả năng file người dùng thêm title.
- Tách bước “parse worksheet” và “validate business schema”.
- Fail fast với lỗi cụ thể theo cột: thiếu cột nào, thừa cột nào, row nào lỗi.
- Với `GHI CHÚ`, xử lý optional field rõ ràng chứ không dựa vào index cứng.

**Warning signs:**
- Import thành công nhưng preview có dữ liệu vô lý (ngày sinh nằm ở cột nơi sinh, tên bị rỗng hàng loạt).
- Chỉ chạy đúng với file mẫu nội bộ.
- Có nhiều `undefined`/empty string ở cột đáng lẽ bắt buộc.
- Support phải “sửa file tay” cho từng đợt import.

**Phase to address:**
Phase import/validation UX.

---

### Pitfall 4: Bỏ qua blank cells, blank rows, duplicate headers trong XLSX parse

**What goes wrong:**
Số cột/record bị lệch khi parse vì ô trống bị bỏ qua, dòng trống bị nuốt mất, hoặc header trùng tên bị thư viện tự đổi tên. Điều này đặc biệt nguy hiểm khi map theo vị trí cột hoặc khi một vài học viên thiếu dữ liệu tùy chọn.

**Why it happens:**
Các thư viện như SheetJS có hành vi mặc định khác nhau giữa object output và array output; empty cells/rows không phải lúc nào cũng được preserve. Developer không cấu hình `defval`, `blankrows`, `header`, hoặc không inspect raw parse result.

**How to avoid:**
- Quyết định rõ parse mode: array-based để giữ cấu trúc, rồi mới map sang domain object; hoặc object-based nhưng phải set option phù hợp.
- Với SheetJS, cấu hình rõ `header`, `defval`, `blankrows`, `raw/cellDates` theo use case.
- Reject duplicate headers hoặc map alias một cách explicit.
- Thêm test case có ô trống giữa dòng, dòng trống xen kẽ, cột tùy chọn bị thiếu.

**Warning signs:**
- Row count sau import không khớp số hàng thật trong Excel.
- Một số học viên “biến mất” khi cột optional rỗng.
- Dữ liệu import lệch sau khi người dùng xóa vài ô trong Excel.
- Header giống nhau bị đổi thành `Tên`, `Tên_1` mà code không xử lý.

**Phase to address:**
Phase import hardening và QA với file thật.

---

### Pitfall 5: Xử lý ngày sinh Excel như text/number một cách cảm tính

**What goes wrong:**
Ngày sinh bị lệch ngày, đọc sai định dạng, hoặc cùng file mà có hàng là text, hàng là serial number. Xuất lại Excel thì ngày hiển thị khác input, làm người dùng mất niềm tin vào hệ thống.

**Why it happens:**
Excel date có nhiều biểu diễn; thư viện parse có option riêng cho raw/formatted/date cell. Developer hay “format bằng mắt” thay vì chuẩn hóa domain type.

**How to avoid:**
- Xác định canonical representation cho ngày sinh trong domain: ví dụ `YYYY-MM-DD` hoặc object date-only.
- Tách parse date khỏi display date.
- Chấp nhận cả text format hợp lệ lẫn Excel date serial, nhưng normalize về một kiểu duy nhất.
- Validate ngày không hợp lệ và report row cụ thể.
- Khi export, set format rõ ràng thay vì trông chờ Excel auto-detect.

**Warning signs:**
- Người dùng báo ngày bị lệch 1 ngày hoặc đổi format sau export.
- Cùng cột ngày sinh nhưng type parse không đồng nhất.
- Có record preview đúng nhưng Excel mở ra lại sai.
- Test chỉ pass với locale máy dev.

**Phase to address:**
Phase import/export data typing.

---

### Pitfall 6: Định nghĩa “công bằng” mơ hồ trong thuật toán phân phòng

**What goes wrong:**
Team nói “phân công bằng” nhưng mỗi người hiểu một kiểu: cân bằng số lượng phòng, giữ lớp đều, tránh cùng lớp quá đông, hay trộn ngẫu nhiên tối đa. Kết quả là thuật toán thay đổi liên tục, user phản hồi “không công bằng”, nhưng không ai chứng minh được đúng/sai.

**Why it happens:**
Fairness không phải khái niệm tự hiển nhiên. Nếu không định nghĩa metric/constraint rõ ràng, team sẽ optimize theo cảm giác hoặc theo case gần nhất bị complaint.

**How to avoid:**
- Viết fairness spec thành rule đo được trước khi code:
  - chênh lệch sĩ số tối đa giữa các phòng là bao nhiêu,
  - mức phân tán theo lớp chấp nhận được,
  - trường hợp nào ưu tiên cân bằng phòng hơn giữ lớp,
  - “tỉ lệ đại diện” được đo thế nào.
- Thể hiện fairness metrics ngay trong preview/dashboard.
- Dùng acceptance test với dataset mẫu và expected bounds, không chỉ expected exact output.

**Warning signs:**
- Nhiều tranh luận “phòng này nhìn không đều” nhưng không có tiêu chí kiểm chứng.
- Mỗi lần đổi thuật toán lại làm hỏng case trước đó.
- QA phải approve bằng cảm tính.
- Không trả lời được câu hỏi “output nào được coi là hợp lệ?”.

**Phase to address:**
Phase domain modeling / algorithm specification, trước khi implement allocator.

---

### Pitfall 7: Heuristic ad-hoc làm vi phạm constraint hoặc thiên lệch lớp

**What goes wrong:**
Thuật toán tham lam (greedy) hoặc random đơn giản cho ra kết quả có phòng lệch nhiều, một lớp bị dồn bất thường, hoặc vài phòng cuối bị nhồi do xử lý phần dư kém. Với manual edit sau đó, trạng thái còn khó giải thích hơn.

**Why it happens:**
Allocation problem tưởng đơn giản nên hay được giải bằng vài vòng lặp `for` + `shuffle`. Khi số lớp, số phòng, và constraint tăng lên, heuristic sơ sài bắt đầu lộ thiên lệch.

**How to avoid:**
- Xem allocator là bài toán constraint-based, không phải chỉ là chia mảng.
- Thiết kế algorithm theo 2 tầng: hard constraints trước, soft objectives sau.
- Tạo deterministic tie-break rõ ràng khi nhiều lựa chọn ngang nhau.
- Chạy simulation trên nhiều dataset edge case: lớp rất lệch size, số phòng không chia hết, 1 lớp quá lớn, room count thay đổi.
- Lưu scoring/explanation để debug vì sao học viên được vào phòng nào.

**Warning signs:**
- Output thay đổi mạnh giữa các lần chạy dù input giống nhau.
- Phòng cuối cùng thường xấu nhất.
- Một vài lớp luôn bị overrepresented ở vài phòng.
- Không thể giải thích vì sao một học viên ở phòng A thay vì B.

**Phase to address:**
Phase thuật toán phân phòng + simulation test.

---

### Pitfall 8: Không khóa tính deterministic của kết quả phân phòng

**What goes wrong:**
Cùng input, cùng setting nhưng mỗi lần bấm “phân phòng” cho ra output khác. Điều này phá auditability, làm khó so sánh lịch sử, khó bugfix, và người dùng mất niềm tin vì “máy tính lúc đúng lúc sai”.

**Why it happens:**
Dùng `Math.random()` trực tiếp, tie-break không ổn định, phụ thuộc iteration order của object/map, hoặc sort comparator không total-order.

**How to avoid:**
- Nếu có randomization, dùng seeded RNG và lưu seed vào lịch sử phân phòng.
- Comparator phải total-order: tên -> họ lót -> MSHV -> row index gốc nếu cần.
- Tách “random có kiểm soát” khỏi “không xác định”.
- Persist cấu hình chạy thuật toán cùng output để reproduce.

**Warning signs:**
- User refresh/re-run là kết quả đổi.
- Không reproduce được bug từ cùng file import.
- Snapshot test fail ngẫu nhiên.
- Lịch sử phân phòng không giải thích được vì sao hai lần chạy khác nhau.

**Phase to address:**
Phase engine + history/audit design.

---

### Pitfall 9: Cho phép chỉnh sửa thủ công nhưng không revalidate toàn bộ invariant

**What goes wrong:**
Sau drag & drop hoặc sửa SBD thủ công, hệ thống để lọt trạng thái sai: trùng SBD, phòng vượt sức chứa, mất cân bằng vượt ngưỡng, học viên biến mất khỏi master sheet, hoặc preview đúng nhưng export sai vì state bị lệch.

**Why it happens:**
Team xem manual edit là thao tác UI nhỏ, không coi đó là mutation vào domain model cần full validation.

**How to avoid:**
- Mọi thao tác thủ công phải đi qua domain command rõ ràng: moveStudent, swapStudents, regenerateSBD.
- Recompute và validate invariant sau mỗi chỉnh sửa.
- Có lớp cảnh báo rõ: blocking errors vs non-blocking warnings.
- Cung cấp undo/redo hoặc ít nhất reset về lần phân tự động gần nhất.

**Warning signs:**
- Sau vài thao tác kéo-thả, số học viên toàn cục không còn khớp.
- Có hai học viên cùng SBD hoặc một phòng vượt limit mà UI không báo.
- Export và preview khác nhau sau manual edit.
- Bug chỉ xảy ra sau khi user “sửa tay vài lần”.

**Phase to address:**
Phase preview/editor và consistency checks.

---

### Pitfall 10: Đánh số báo danh phụ thuộc vị trí hiển thị thay vì domain state

**What goes wrong:**
SBD `Pxx-yyy` bị trùng, nhảy số, hoặc đổi không kiểm soát khi sort/filter/drag-drop. Một số hệ thống còn đánh lại SBD theo thứ tự đang filter trên UI, dẫn tới file in và file tổng không khớp.

**Why it happens:**
SBD thường bị generate quá muộn, hoặc gắn trực tiếp với index render trong bảng thay vì allocation state chính thức.

**How to avoid:**
- Xem SBD là derived domain field có rule rõ ràng, không phải UI artifact.
- Quy định khi nào auto-regenerate, khi nào preserve.
- Chạy uniqueness check toàn cục trước export.
- Tách display order khỏi identity/order dùng để cấp SBD.

**Warning signs:**
- Reorder bảng làm đổi SBD.
- In danh sách phòng và sheet tổng có SBD khác nhau.
- User kéo 1 học viên giữa phòng rồi phát sinh trùng mã.
- Có bug “mất liên tục số thứ tự” sau chỉnh sửa.

**Phase to address:**
Phase domain identifiers + editor flow.

---

### Pitfall 11: Xuất Excel “xem được” nhưng không “dùng được ngay”

**What goes wrong:**
File export mở được nhưng cột lệch, width quá hẹp, sheet phòng thiếu header/footer cần in, tên sheet trùng/không hợp lệ, dữ liệu tổng và dữ liệu từng phòng không đồng bộ. Người dùng cuối vẫn phải chỉnh tay nhiều trong Excel.

**Why it happens:**
Team coi export là bước serialize đơn giản, không test bằng quy trình thật của cán bộ khảo thí: mở file, in từng phòng, đối chiếu sheet tổng.

**How to avoid:**
- Thiết kế output contract rõ: 1 sheet tổng + mỗi phòng 1 sheet riêng + tiêu đề/độ rộng cột phù hợp.
- Sanitize tên sheet và bảo đảm unique.
- Generate từ cùng một source-of-truth object, không build riêng master và room sheets theo hai luồng khác nhau.
- Test bằng file thật, mở bằng Excel/LibreOffice, và in thử.

**Warning signs:**
- Demo trên web đẹp nhưng file Excel cần sửa tay trước khi in.
- Người dùng copy/paste lại sang file khác để dùng.
- Một học viên xuất hiện ở room sheet nhưng thiếu ở sheet tổng.
- Tên sheet lỗi hoặc bị Excel tự đổi.

**Phase to address:**
Phase export/print acceptance testing.

---

### Pitfall 12: Không có audit trail đủ mạnh cho công cụ nội bộ public, không auth

**What goes wrong:**
Vì v1 public không auth, bất kỳ ai có link đều có thể upload/chạy/lưu lịch sử. Nếu không log đủ input, config, seed, timestamp, và checksum file, team không biết ai/phiên nào tạo ra kết quả đang được dùng; việc điều tra sai sót gần như mù.

**Why it happens:**
Nghĩ rằng “internal tool” thì không cần audit. Nhưng public access + dữ liệu thi cử khiến truy vết còn quan trọng hơn.

**How to avoid:**
- Lưu metadata lịch sử tối thiểu: thời gian, tên file, hash/checksum, room count, strategy, fairness settings, seed, snapshot output.
- Giới hạn retention hợp lý và ẩn dữ liệu nhạy cảm khi không cần.
- Thêm confirmation trước khi overwrite/chỉnh sửa kết quả cũ.
- Nếu chưa có auth, ít nhất cần session/request identifier để trace.

**Warning signs:**
- Không trả lời được “kết quả này được tạo từ file nào/cấu hình nào?”.
- Hai bản phân phòng khác nhau nhưng không biết khác ở đâu.
- Support phải yêu cầu user gửi lại toàn bộ file để debug.
- Khi có khiếu nại, không reconstruct được quá trình tạo kết quả.

**Phase to address:**
Phase persistence/history và operational safeguards.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Map cột Excel theo index cứng | Code nhanh, ít config | Chết ngay khi file đổi thứ tự cột hoặc thêm `GHI CHÚ` | Chỉ chấp nhận cho spike nội bộ, không vào production |
| Sort bằng `localeCompare()` không chuẩn hóa comparator dùng chung | Nhanh có kết quả | Preview, export, print cho thứ tự khác nhau | Chỉ tạm nếu đã bọc trong một helper duy nhất và có test tiếng Việt |
| Dùng `Math.random()` trực tiếp trong allocator | Dễ tạo cảm giác “trộn đều” | Không reproduce được, mất audit | Không nên dùng trong production |
| Regenerate SBD từ row index của UI | Triển khai rất nhanh | Trùng/mất ổn định sau filter/drag-drop | Never |
| Build master sheet và room sheets từ hai luồng dữ liệu khác nhau | Dễ code từng phần | Sai lệch dữ liệu giữa các output | Never |
| Chấp nhận import “best effort” dù thiếu cột bắt buộc | User thấy đỡ bị chặn | Sai âm thầm, hậu quả lớn ở phân phòng | Chỉ khi có review/confirmation rõ và không áp dụng cho cột bắt buộc |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SheetJS / Excel parser | Tin rằng parse xong là dữ liệu hợp lệ | Parse worksheet trước, validate business schema sau |
| ExcelJS / export writer | Assume worksheet id tuần tự, sheet naming tự ổn | Treat sheet IDs như opaque, tự quản tên sheet hợp lệ/unique |
| PostgreSQL + Prisma | Lưu raw text không normalize | Normalize text trước khi persist, lưu metadata import nếu cần audit |
| Next.js upload flow | Parse file ngay trong UI rồi xem như xong | Có server-side validation lại trước khi commit vào history |
| Print-friendly HTML | Dùng cùng markup bảng preview cho in | Tạo print layout riêng, kiểm soát page breaks và header phòng |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recompute toàn bộ allocation và chart sau mọi drag event | UI giật, kéo-thả lag | Debounce/chỉ recompute phần affected, tách compute khỏi render | Thấy rõ từ vài trăm học viên + nhiều phòng |
| Parse/export workbook lớn trên main thread | Browser đơ khi upload/xuất | Offload hợp lý hoặc xử lý server-side cho bước nặng | Với file lớn hơn mẫu hiện tại hoặc máy yếu |
| Dùng quá nhiều derived sort/filter riêng lẻ ở nhiều component | Mỗi màn hình cho kết quả hơi khác, hiệu năng tệ | Centralize selectors/comparators | Từ giai đoạn preview + dashboard cùng tồn tại |
| Lưu mọi phiên bản output đầy đủ không chiến lược | DB phình nhanh | Chỉ lưu snapshot cần thiết + retention policy | Sau một thời gian vận hành nội bộ |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Public upload endpoint không giới hạn kích thước/tần suất | Abuse, tốn tài nguyên, treo app | Giới hạn file size, rate limit, validate MIME + extension |
| Lưu file import/raw output vô thời hạn | Rò rỉ dữ liệu cá nhân học viên | Retention policy, xóa file tạm, chỉ lưu metadata khi đủ dùng |
| Render trực tiếp giá trị Excel vào UI/print mà không escape đúng | Inject nội dung xấu vào giao diện in/xem trước | Escape/sanitize trước render, đặc biệt với ghi chú tùy ý |
| Cho download lịch sử công khai không phân biệt session | Lộ danh sách học viên và kết quả thi | Tối thiểu có token phiên / ID khó đoán / scope truy cập |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Báo lỗi import kiểu chung chung “file không hợp lệ” | Cán bộ không biết sửa file ở đâu | Chỉ rõ sheet, cột, dòng, giá trị lỗi, và ví dụ format đúng |
| Preview không giải thích vì sao phân vào phòng đó | User không tin thuật toán | Hiển thị chỉ số cân bằng, phân bổ lớp, và rule đang áp dụng |
| Drag & drop xong không báo hệ quả | User vô tình phá cân bằng/SBD | Hiển thị warning ngay khi thao tác gây vi phạm hoặc lệch chuẩn |
| Export xong nhưng không có bước đối chiếu nhanh | User phát hiện lỗi quá muộn lúc in | Có checklist trước export: tổng số HV, số phòng, trùng SBD, lệch sức chứa |
| Dùng thuật ngữ kỹ thuật thay vì ngôn ngữ nghiệp vụ | User văn phòng khó hiểu | UI dùng tiếng Việt nghiệp vụ: “giữ tương đối theo lớp”, “chênh lệch sĩ số”, “đánh lại SBD” |

## "Looks Done But Isn't" Checklist

- [ ] **Import XLSX:** Không chỉ đọc được file mẫu — verify file thiếu `GHI CHÚ`, có ô trống, cột đảo thứ tự, và header dư khoảng trắng vẫn xử lý đúng.
- [ ] **Vietnamese sort:** Không chỉ pass vài tên có dấu — verify preview, editor, export, print đều dùng cùng comparator.
- [ ] **Allocator:** Không chỉ cho ra kết quả — verify fairness metrics, deterministic re-run, và constraint bounds được log rõ.
- [ ] **Manual edit:** Không chỉ kéo-thả được — verify không mất học viên, không trùng SBD, không vượt sức chứa.
- [ ] **Excel export:** Không chỉ mở được — verify dùng được ngay để in, đối chiếu sheet tổng và từng phòng khớp nhau.
- [ ] **History:** Không chỉ lưu snapshot — verify reproduce được từ file + config + seed + timestamp.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sort tiếng Việt sai đã lọt vào output | MEDIUM | Sửa comparator trung tâm, normalize dữ liệu, regenerate preview/export, rerun regression dataset tiếng Việt |
| Import parse lệch cột | HIGH | Chặn import hiện tại, bổ sung schema validator + error reporting, yêu cầu re-import từ file gốc |
| Fairness spec mơ hồ dẫn đến output bị khiếu nại | HIGH | Đóng băng thuật toán, thống nhất fairness contract với stakeholder, rerun toàn bộ dataset mẫu |
| Kết quả không deterministic | MEDIUM | Introduce seed + tie-break ổn định, lưu config lịch sử, migrate flow re-run |
| Manual edit phá invariant | MEDIUM | Thêm validation sau mutation, phát hiện bản ghi lỗi, cung cấp công cụ “repair/regenerate SBD” |
| Export master/room sheets lệch nhau | HIGH | Refactor về single source of truth, audit lại file đã xuất, re-export toàn bộ |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Sort tên tiếng Việt sai | Phase 1: import + domain normalization | Bộ test tên tiếng Việt pass và preview/export/print cùng thứ tự |
| Unicode không normalize | Phase 1: ingestion pipeline | Hai chuỗi canonically equivalent được coi là cùng giá trị domain |
| Header/schema Excel mong manh | Phase 1: import validator | Import báo lỗi đúng cột/dòng trên nhiều file biến thể |
| Blank cells/rows làm lệch parse | Phase 1: import hardening | Row count và field mapping ổn định trên file có ô trống/dòng trống |
| Date handling sai | Phase 1: typing + validation | Ngày sinh không lệch trước/sau export với nhiều định dạng input |
| Fairness mơ hồ | Phase 2: algorithm specification | Có tài liệu metric/constraint và dashboard thể hiện được |
| Heuristic thiên lệch | Phase 2: allocation engine | Simulation dataset edge cases vẫn nằm trong ngưỡng công bằng |
| Kết quả không deterministic | Phase 2: engine reproducibility | Cùng input + config + seed cho cùng output |
| Manual edit phá invariant | Phase 3: preview/editor | Mọi thao tác chỉnh sửa đều trigger validation và không làm sai tổng |
| SBD phụ thuộc UI order | Phase 3: identifier rules | Reorder/filter UI không làm đổi SBD ngoài rule cho phép |
| Excel export không dùng được ngay | Phase 4: export/print polish | Người dùng mở/in trực tiếp mà không cần sửa tay |
| Thiếu audit trail | Phase 4: history/operations | Tái dựng được kết quả từ metadata lịch sử |

## Sources

- MDN Web Docs — Intl.Collator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
- MDN Web Docs — String.prototype.normalize(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
- SheetJS Docs — array/object conversion behavior and parsing caveats: https://docs.sheetjs.com/docs/api/utilities/array#array-of-objects-input
- SheetJS Docs — import examples: https://docs.sheetjs.com/docs/getting-started/examples/import
- SheetJS Docs — export examples: https://docs.sheetjs.com/docs/getting-started/examples/export
- ExcelJS GitHub README / known behavior notes: https://github.com/exceljs/exceljs
- Fairness measure overview (used only as supporting concept for “fairness must be explicitly defined”, not as domain authority): https://en.wikipedia.org/wiki/Fairness_measure

---
*Pitfalls research for: exam room allocation / student distribution web app*
*Researched: 2026-04-08*
