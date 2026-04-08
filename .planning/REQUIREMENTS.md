# Requirements: ExamRoomAllocator

**Defined:** 2026-04-08
**Core Value:** Phân phòng thi chính xác, công bằng, và xuất kết quả dùng được ngay (Excel + in) — không lỗi font, không lệch cột, sắp xếp tiếng Việt chuẩn.

## v1 Requirements

### Import & Validation

- [ ] **IMPT-01**: User can upload `.xlsx` file containing student roster data
- [ ] **IMPT-02**: User can import files with required columns `Lớp`, `MSHV`, `HỌ LÓT`, `TÊN`, `NGÀY SINH`, `NƠI SINH`
- [ ] **IMPT-03**: User can import files whether optional `GHI CHÚ` column is present or absent
- [ ] **IMPT-04**: User sees row-level validation errors for missing required columns, invalid values, or malformed rows before allocation runs
- [ ] **IMPT-05**: User can import rosters with Vietnamese text normalized consistently for sorting, searching, and export
- [ ] **IMPT-06**: User can import birth dates from valid Excel date cells or supported text formats without shifting the date value

### Allocation Rules

- [ ] **ALOC-01**: User can choose the number of exam rooms before allocation runs
- [ ] **ALOC-02**: User can run allocation using strategy 1: mix all students evenly across rooms
- [ ] **ALOC-03**: User can run allocation using strategy 2: keep students relatively grouped by class while still prioritizing room balance
- [ ] **ALOC-04**: User can run allocation using strategy 3: distribute class representation proportionally across rooms while still prioritizing room balance
- [ ] **ALOC-05**: User gets deterministic allocation results for the same input file and same settings
- [ ] **ALOC-06**: User gets room sizes that stay as even as possible across all rooms
- [ ] **ALOC-07**: User gets student ordering sorted by `TÊN`, then `HỌ LÓT`, then `MSHV` using Vietnamese collation rules
- [ ] **ALOC-08**: User gets candidate numbers generated in `Pxx-yyy` format for every allocated student

### Preview & Dashboard

- [ ] **PREV-01**: User can preview the full allocation result before exporting
- [ ] **PREV-02**: User can view each room’s student list, room size, and room order in the preview
- [ ] **PREV-03**: User can view summary metrics showing total students, number of rooms, and room-size balance
- [ ] **PREV-04**: User can view class-distribution metrics across rooms to judge fairness
- [ ] **PREV-05**: User sees warnings when imported data or allocation results violate required rules

### Manual Editing

- [ ] **EDIT-01**: User can move a student from one room to another after auto-allocation
- [ ] **EDIT-02**: User can reorder students within a room after auto-allocation
- [ ] **EDIT-03**: User can drag and drop students between rooms in the editing interface
- [ ] **EDIT-04**: User sees validation feedback when a manual edit causes invalid room balance, missing students, or duplicate SBDs
- [ ] **EDIT-05**: User can save manual edits and keep preview, export, and print outputs synchronized with the edited result

### Export & Print

- [ ] **EXPT-01**: User can export the final result as `.xlsx` file
- [ ] **EXPT-02**: User gets one master sheet containing all allocated students in the exported workbook
- [ ] **EXPT-03**: User gets one separate sheet per exam room in the exported workbook
- [ ] **EXPT-04**: User gets exported workbook columns containing original student information plus `Phòng thi`, `Số báo danh`, and `Thứ tự trong phòng`
- [ ] **EXPT-05**: User can print a room-specific list from the web with print-friendly formatting
- [ ] **EXPT-06**: User gets exported and printed outputs whose ordering and SBD values match the approved preview exactly

### History & Audit

- [ ] **HIST-01**: User can save each allocation run to persistent storage
- [ ] **HIST-02**: User can reopen a previously saved allocation run and view its result
- [ ] **HIST-03**: User can see run metadata including source file name, timestamp, strategy, room count, and configuration used
- [ ] **HIST-04**: User can reproduce which settings created a saved allocation result

### Public Operation Safeguards

- [ ] **SAFE-01**: User can only upload supported `.xlsx` files within configured file-size limits
- [ ] **SAFE-02**: User cannot trigger allocation/export flows that bypass server-side validation
- [ ] **SAFE-03**: User data is retained only according to the project’s history and cleanup policy

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
| IMPT-01 | Phase TBD | Pending |
| IMPT-02 | Phase TBD | Pending |
| IMPT-03 | Phase TBD | Pending |
| IMPT-04 | Phase TBD | Pending |
| IMPT-05 | Phase TBD | Pending |
| IMPT-06 | Phase TBD | Pending |
| ALOC-01 | Phase TBD | Pending |
| ALOC-02 | Phase TBD | Pending |
| ALOC-03 | Phase TBD | Pending |
| ALOC-04 | Phase TBD | Pending |
| ALOC-05 | Phase TBD | Pending |
| ALOC-06 | Phase TBD | Pending |
| ALOC-07 | Phase TBD | Pending |
| ALOC-08 | Phase TBD | Pending |
| PREV-01 | Phase TBD | Pending |
| PREV-02 | Phase TBD | Pending |
| PREV-03 | Phase TBD | Pending |
| PREV-04 | Phase TBD | Pending |
| PREV-05 | Phase TBD | Pending |
| EDIT-01 | Phase TBD | Pending |
| EDIT-02 | Phase TBD | Pending |
| EDIT-03 | Phase TBD | Pending |
| EDIT-04 | Phase TBD | Pending |
| EDIT-05 | Phase TBD | Pending |
| EXPT-01 | Phase TBD | Pending |
| EXPT-02 | Phase TBD | Pending |
| EXPT-03 | Phase TBD | Pending |
| EXPT-04 | Phase TBD | Pending |
| EXPT-05 | Phase TBD | Pending |
| EXPT-06 | Phase TBD | Pending |
| HIST-01 | Phase TBD | Pending |
| HIST-02 | Phase TBD | Pending |
| HIST-03 | Phase TBD | Pending |
| HIST-04 | Phase TBD | Pending |
| SAFE-01 | Phase TBD | Pending |
| SAFE-02 | Phase TBD | Pending |
| SAFE-03 | Phase TBD | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 0
- Unmapped: 36 ⚠️

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after initial definition*
