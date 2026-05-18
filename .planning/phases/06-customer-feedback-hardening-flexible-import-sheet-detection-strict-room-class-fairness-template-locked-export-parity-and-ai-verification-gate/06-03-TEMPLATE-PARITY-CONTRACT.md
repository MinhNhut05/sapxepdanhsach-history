# Template Parity Contract for Phase 06 Plan 03

This artifact is the source of truth for customer-approved workbook parity in Phase 06 Plan 03.

## Contract Identity

- Contract artifact: `06-03-TEMPLATE-PARITY-CONTRACT.md`
- Runtime implementation: `src/features/allocation/server/export-template-contract.ts`
- Template version: `phase-06-plan-03-v1`
- Data source: `projectOutputRecords()` from authoritative saved-run records only

## Approved Modes

### Full workbook mode
- Sheet order:
  1. `Tổng hợp`
  2. One sheet per room in ascending room number format `Phòng XX`
- Uses full template contract for all sheets.

### Room-only workbook mode
- Preferred mode: `room_template`
- Current configured policy: room-only template contract is not configured in runtime
- Required fallback: `full_template_single_room_fallback`
- Fallback behavior: generate a workbook with the same full-sheet contract, but only for the requested room sheet and without the summary sheet
- Export metadata must declare the selected mode explicitly

## Sheet Frame Contract

### Shared structure
- Title row: merged across all visible columns on row `1`
- Subtitle row: merged across all visible columns on row `2`
- Metadata row: row `3` with label/value slots
- Spacer row: row `4`
- Header row: row `5`
- Data rows start at row `6`
- Freeze panes: `ySplit = 5`
- Auto filter: full header row width

### Print contract
- Orientation: landscape
- Fit to width: `1`
- Fit to height: `0`
- Paper size: A4 (`9` in ExcelJS)
- Margins:
  - left/right: `0.35`
  - top/bottom: `0.45`
  - header/footer: `0.2`
- Repeat title row: none
- Print area: full populated table range

## Column Mapping Contract

Visible columns are locked in this order:

| Column | Header | Source field | Notes |
| --- | --- | --- | --- |
| A | STT | `ordinal` | 1-based row order within sheet |
| B | SBD | `candidateNumber` | authoritative candidate number |
| C | HỌ LÓT | `middleName` | never reconstruct from `fullName` when split values exist |
| D | TÊN | `firstName` | never reconstruct from `fullName` when split values exist |
| E | NGÀY SINH | `birthDateIso` formatted `dd/MM/yyyy` | print-friendly display |
| F | LỚP | `className` | authoritative class name |
| G | MSHV | `studentCode` | authoritative student code |
| H | NƠI SINH | `birthPlace` | authoritative birthplace |
| I | PHÒNG THI | `roomLabel` | authoritative room label |
| J | THỨ TỰ | `seatIndex` | authoritative in-room order |
| K | HỌ VÀ TÊN | `fullName` | only for parity/reference column where full name is explicitly required |
| L | GHI CHÚ | `note` | blank string when null |

## Labels

### Full workbook labels
- Title: `DANH SÁCH PHÂN PHÒNG THI`
- Subtitle: `Tổng hợp toàn bộ học viên sau khi phân phòng`
- Metadata labels:
  - `Tổng học viên`
  - `Số phòng`
  - `Nguồn dữ liệu`

### Room sheet labels
- Title: `DANH SÁCH PHÒNG XX`
- Subtitle: `Danh sách học viên của phòng thi đã được chốt`
- Metadata labels:
  - `Phòng thi`
  - `Sĩ số`
  - `Chế độ xuất`

## Styling contract
- Title fill: `E6D0B2`
- Subtitle fill: `F4EADD`
- Header fill: `F0DDC2`
- Border color: `CDB99C`
- Metadata fill: `FBF6EF`
- Title text color: `4A3112`
- Body text color: `2D2318`

## Runtime linkage requirements
- `export-template-contract.ts` must expose the template version and locked contract values from this artifact.
- `export-allocation-workbook.ts` must apply layout through one `applyTemplateContract()` path.
- Any contract drift must be caught by regression tests in:
  - `tests/allocation/export-allocation-workbook.test.ts`
  - `tests/api/allocation-export-route.test.ts`
