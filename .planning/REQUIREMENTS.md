# Requirements: ExamRoomAllocator

**Defined:** 2026-04-08
**Core Value:** Phân phòng thi chính xác, công bằng, và xuất kết quả dùng được ngay (Excel + in) — không lỗi font, không lệch cột, sắp xếp tiếng Việt chuẩn.

## v1 Requirements

### Import & Validation

- [x] **IMPT-01**: User can upload `.xlsx` file containing student roster data
- [x] **IMPT-02**: User can import files with required columns `Lớp`, `MSHV`, `HỌ LÓT`, `TÊN`, `NGÀY SINH`, `NƠI SINH`
- [x] **IMPT-03**: User can import files whether optional `GHI CHÚ` column is present or absent
- [x] **IMPT-04**: User sees row-level validation errors for missing required columns, invalid values, or malformed rows before allocation runs
- [x] **IMPT-05**: User can import rosters with Vietnamese text normalized consistently for sorting, searching, and export
- [x] **IMPT-06**: User can import birth dates from valid Excel date cells or supported text formats without shifting the date value

### Allocation Rules

- [x] **ALOC-01**: User can choose the number of exam rooms before allocation runs
- [x] **ALOC-02**: User can run allocation using strategy 1: mix all students evenly across rooms
- [x] **ALOC-03**: User can run allocation using strategy 2: keep students relatively grouped by class while still prioritizing room balance
- [x] **ALOC-04**: User can run allocation using strategy 3: distribute class representation proportionally across rooms while still prioritizing room balance
- [x] **ALOC-05**: User gets deterministic allocation results for the same input file and same settings
- [x] **ALOC-06**: User gets room sizes that stay as even as possible across all rooms
- [x] **ALOC-07**: User gets student ordering sorted by `TÊN`, then `HỌ LÓT`, then `MSHV` using Vietnamese collation rules
- [x] **ALOC-08**: User gets candidate numbers generated in `Pxx-yyy` format for every allocated student

### Preview & Dashboard

- [x] **PREV-01**: User can preview the full allocation result before exporting
- [x] **PREV-02**: User can view each room’s student list, room size, and room order in the preview
- [x] **PREV-03**: User can view summary metrics showing total students, number of rooms, and room-size balance
- [x] **PREV-04**: User can view class-distribution metrics across rooms to judge fairness
- [x] **PREV-05**: User sees warnings when imported data or allocation results violate required rules

### Manual Editing

- [x] **EDIT-01**: User can move a student from one room to another after auto-allocation
- [x] **EDIT-02**: User can reorder students within a room after auto-allocation
- [x] **EDIT-03**: User can drag and drop students between rooms in the editing interface
- [x] **EDIT-04**: User sees validation feedback when a manual edit causes invalid room balance, missing students, or duplicate SBDs
- [x] **EDIT-05**: User can save manual edits and keep preview, export, and print outputs synchronized with the edited result

### Export & Print

- [x] **EXPT-01**: User can export the final result as `.xlsx` file
- [x] **EXPT-02**: User gets one master sheet containing all allocated students in the exported workbook
- [x] **EXPT-03**: User gets one separate sheet per exam room in the exported workbook
- [x] **EXPT-04**: User gets exported workbook columns containing original student information plus `Phòng thi`, `Số báo danh`, and `Thứ tự trong phòng`
- [x] **EXPT-05**: User can print a room-specific list from the web with print-friendly formatting
- [x] **EXPT-06**: User gets exported and printed outputs whose ordering and SBD values match the approved preview exactly

### History & Audit

- [x] **HIST-01**: User can save each allocation run to persistent storage
- [x] **HIST-02**: User can reopen a previously saved allocation run and view its result
- [x] **HIST-03**: User can see run metadata including source file name, timestamp, strategy, room count, and configuration used
- [x] **HIST-04**: User can reproduce which settings created a saved allocation result

### Public Operation Safeguards

- [x] **SAFE-01**: User can only upload supported `.xlsx` files within configured file-size limits
- [x] **SAFE-02**: User cannot trigger allocation/export flows that bypass server-side validation
- [x] **SAFE-03**: User data is retained only according to the project’s history and cleanup policy

## v1.1 Requirements

### Smart Intake

- [x] **INTK-01**: User can import `.xlsx`, `.xls`, or `.csv` through one intake flow
- [x] **INTK-02**: System can detect header row, delimiter/encoding, and column mapping even when files contain title rows, blank rows, alias headers, or mild layout noise
- [x] **INTK-03**: User can ingest recoverable roster files without manually cleaning the spreadsheet first
- [x] **INTK-04**: System can auto-normalize safe issues such as whitespace, casing, supported date variants, and benign header differences

### Confidence & Review

- [x] **REVW-01**: System assigns high, medium, or low confidence to mappings and repairs
- [ ] **REVW-02**: Clean files proceed directly into the existing allocation flow, while messy files branch into an intake review workspace before allocation
- [ ] **REVW-03**: User must review medium/low-confidence changes before allocation proceeds

### Audit & Safeguards

- [x] **AUDT-01**: User can inspect an intake audit trail showing raw value, proposed value, decision source (`rule` or `ai`), confidence, and short reasoning
- [x] **SAFE-04**: Sensitive fields such as `MSHV` and `Lớp` are never silently auto-corrected
- [ ] **SAFE-05**: When the AI provider is unavailable or quota-limited, user can continue with rule-based intake plus review instead of being blocked

## v2 Requirements

### Custom Templates

- **TMPL-01**: User can choose institution-specific Excel export templates
- **TMPL-02**: User can choose institution-specific print layouts

### Advanced Rules

- **RULE-01**: User can configure allowable room-size variance thresholds
- **RULE-02**: User can configure class-preservation thresholds for allocation strategy 2
- **RULE-03**: User can configure proportional-representation thresholds for allocation strategy 3
- **RULE-04**: User can apply exception rules for specific students or groups

### Collaboration & Access

- **AUTH-01**: User can access the app through authenticated sessions
- **AUTH-02**: User can limit access to saved runs by user or organization
- **AUTH-03**: User can compare two saved allocation runs side by side

### Intake Operations

- **IOPS-01**: Operator can view intake metrics and provider usage for troubleshooting
- **IOPS-02**: Operator can tune repair policies and confidence thresholds without code changes
- **IOPS-03**: Operator can compare multiple candidate mappings/repairs side by side before choosing one

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full exam management suite | Not core to validating the room-allocation product |
| Real-time multi-user collaboration | High complexity, low v1 value for single-operator workflow |
| Native mobile app | Spreadsheet-heavy workflow is desktop-first |
| PDF-first export pipeline | Excel + print-friendly web output is enough for v1 |
| Generic no-code rule builder | Too much complexity before core patterns are validated |
| Multi-tenant architecture | v1 serves one organization/workflow |
| Login/authentication | User chose public no-auth model for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMPT-01 | Phase 1 | Done |
| IMPT-02 | Phase 1 | Done |
| IMPT-03 | Phase 1 | Done |
| IMPT-04 | Phase 1 | Done |
| IMPT-05 | Phase 1 | Done |
| IMPT-06 | Phase 1 | Done |
| ALOC-01 | Phase 2 | Done |
| ALOC-02 | Phase 2 | Done |
| ALOC-03 | Phase 2 | Done |
| ALOC-04 | Phase 2 | Done |
| ALOC-05 | Phase 2 | Done |
| ALOC-06 | Phase 2 | Done |
| ALOC-07 | Phase 2 | Done |
| ALOC-08 | Phase 2 | Done |
| PREV-01 | Phase 3 | Done |
| PREV-02 | Phase 3 | Done |
| PREV-03 | Phase 3 | Done |
| PREV-04 | Phase 3 | Done |
| PREV-05 | Phase 3 | Done |
| EDIT-01 | Phase 3 | Done |
| EDIT-02 | Phase 3 | Done |
| EDIT-03 | Phase 3 | Done |
| EDIT-04 | Phase 3 | Done |
| EDIT-05 | Phase 3 | Done |
| EXPT-01 | Phase 4 | Done |
| EXPT-02 | Phase 4 | Done |
| EXPT-03 | Phase 4 | Done |
| EXPT-04 | Phase 4 | Done |
| EXPT-05 | Phase 4 | Done |
| EXPT-06 | Phase 4 | Done |
| HIST-01 | Phase 2 | Done |
| HIST-02 | Phase 4 | Done |
| HIST-03 | Phase 2 | Done |
| HIST-04 | Phase 2 | Done |
| SAFE-01 | Phase 1 | Done |
| SAFE-02 | Phase 1 | Done |
| SAFE-03 | Phase 4 | Done |
| INTK-01 | Phase 5 | Complete |
| INTK-02 | Phase 5 | Complete |
| INTK-03 | Phase 5 | Complete |
| INTK-04 | Phase 5 | Complete |
| REVW-01 | Phase 5 | Complete |
| REVW-02 | Phase 5 | Pending |
| REVW-03 | Phase 5 | Pending |
| AUDT-01 | Phase 5 | Complete |
| SAFE-04 | Phase 5 | Complete |
| SAFE-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 36 total
- v1.1 requirements: 10 total
- Mapped to phases: 46
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after Phase 5 definition*
