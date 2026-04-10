import { Workbook, type Cell, type Worksheet } from "exceljs";

import type {
  AllocationOutputRow,
  EditableAllocationRun,
} from "../domain/allocation-types";

import { projectOutputRecords } from "./project-output-records";
import {
  resolveRoomOnlyExportMode,
  SHEET_TEMPLATE_CONTRACT,
  TEMPLATE_VERSION,
  type ExportMode,
  type TemplateMetadataEntry,
} from "./export-template-contract";

interface WorksheetRow {
  ordinal: number;
  candidateNumber: string;
  middleName: string;
  firstName: string;
  birthDateDisplay: string;
  className: string;
  studentCode: string;
  birthPlace: string;
  roomLabel: string;
  seatIndex: number;
  fullName: string;
  note: string;
}

export interface ExportAllocationWorkbookOptions {
  roomNumber?: number;
}

export interface ExportAllocationWorkbookResult {
  bytes: Uint8Array;
  templateVersion: string;
  exportMode: ExportMode;
}

function formatBirthDateIso(value: string): string {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!parts) {
    return value;
  }

  return `${parts[3]}/${parts[2]}/${parts[1]}`;
}

function toWorksheetRows(rows: AllocationOutputRow[]): WorksheetRow[] {
  return rows.map((row, index) => ({
    ordinal: index + 1,
    candidateNumber: row.candidateNumber,
    middleName: row.middleName,
    firstName: row.firstName,
    birthDateDisplay: formatBirthDateIso(row.birthDateIso),
    className: row.className,
    studentCode: row.studentCode,
    birthPlace: row.birthPlace,
    roomLabel: row.roomLabel,
    seatIndex: row.seatIndex,
    fullName: row.fullName,
    note: row.note ?? "",
  }));
}

function normalizeWorkbookBytes(buffer: Awaited<ReturnType<Workbook["xlsx"]["writeBuffer"]>>): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }

  return new Uint8Array(buffer);
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*\[\]]/g, "-").slice(0, 31);
}

function styleCellBorder(cell: Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: SHEET_TEMPLATE_CONTRACT.borderColor } },
    left: { style: "thin", color: { argb: SHEET_TEMPLATE_CONTRACT.borderColor } },
    bottom: { style: "thin", color: { argb: SHEET_TEMPLATE_CONTRACT.borderColor } },
    right: { style: "thin", color: { argb: SHEET_TEMPLATE_CONTRACT.borderColor } },
  };
}

function applySheetFrame(
  worksheet: Worksheet,
  title: string,
  subtitle: string,
  metadata: TemplateMetadataEntry[],
) {
  worksheet.mergeCells(
    SHEET_TEMPLATE_CONTRACT.titleRowNumber,
    1,
    SHEET_TEMPLATE_CONTRACT.titleRowNumber,
    SHEET_TEMPLATE_CONTRACT.totalColumns,
  );
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.titleRowNumber, 1).value = title;
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.titleRowNumber, 1).font = {
    bold: true,
    size: 16,
    color: { argb: SHEET_TEMPLATE_CONTRACT.titleTextColor },
  };
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.titleRowNumber, 1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.titleRowNumber, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: SHEET_TEMPLATE_CONTRACT.titleFill },
  };
  worksheet.getRow(SHEET_TEMPLATE_CONTRACT.titleRowNumber).height = 26;

  worksheet.mergeCells(
    SHEET_TEMPLATE_CONTRACT.subtitleRowNumber,
    1,
    SHEET_TEMPLATE_CONTRACT.subtitleRowNumber,
    SHEET_TEMPLATE_CONTRACT.totalColumns,
  );
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.subtitleRowNumber, 1).value = subtitle;
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.subtitleRowNumber, 1).font = {
    italic: true,
    size: 11,
    color: { argb: SHEET_TEMPLATE_CONTRACT.subtitleTextColor },
  };
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.subtitleRowNumber, 1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(SHEET_TEMPLATE_CONTRACT.subtitleRowNumber, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: SHEET_TEMPLATE_CONTRACT.subtitleFill },
  };
  worksheet.getRow(SHEET_TEMPLATE_CONTRACT.subtitleRowNumber).height = 20;

  metadata.forEach((entry, index) => {
    const slot = SHEET_TEMPLATE_CONTRACT.metadataSlots[index];

    if (!slot) {
      return;
    }

    const [labelColumn, valueColumn] = slot;
    const labelCell = worksheet.getCell(SHEET_TEMPLATE_CONTRACT.metadataRowNumber, labelColumn);
    const valueCell = worksheet.getCell(SHEET_TEMPLATE_CONTRACT.metadataRowNumber, valueColumn);

    labelCell.value = entry.label;
    valueCell.value = entry.value;
    labelCell.font = { bold: true, color: { argb: SHEET_TEMPLATE_CONTRACT.subtitleTextColor } };
    valueCell.font = { bold: true, color: { argb: SHEET_TEMPLATE_CONTRACT.bodyTextColor } };

    [labelCell, valueCell].forEach((cell) => {
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: SHEET_TEMPLATE_CONTRACT.metadataFill },
      };
      styleCellBorder(cell);
    });
  });
}

function applyHeaderRow(worksheet: Worksheet) {
  const headerRow = worksheet.getRow(SHEET_TEMPLATE_CONTRACT.headerRowNumber);

  SHEET_TEMPLATE_CONTRACT.columns.forEach((column, index) => {
    const columnIndex = index + 1;
    const cell = headerRow.getCell(columnIndex);

    worksheet.getColumn(columnIndex).width = column.width;
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: SHEET_TEMPLATE_CONTRACT.titleTextColor } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SHEET_TEMPLATE_CONTRACT.headerFill },
    };
    styleCellBorder(cell);
  });

  headerRow.height = 22;
}

function getColumnValue(row: WorksheetRow, columnKey: (typeof SHEET_TEMPLATE_CONTRACT.columns)[number]["key"]) {
  switch (columnKey) {
    case "birthDateIso":
      return row.birthDateDisplay;
    case "note":
      return row.note;
    default:
      return row[columnKey];
  }
}

function applyDataRows(worksheet: Worksheet, rows: WorksheetRow[]) {
  rows.forEach((row, rowIndex) => {
    const worksheetRow = worksheet.getRow(SHEET_TEMPLATE_CONTRACT.dataRowStartNumber + rowIndex);

    SHEET_TEMPLATE_CONTRACT.columns.forEach((column, columnIndex) => {
      const cell = worksheetRow.getCell(columnIndex + 1);

      cell.value = getColumnValue(row, column.key);
      cell.alignment = {
        horizontal: column.horizontal,
        vertical: "middle",
        wrapText: true,
      };
      cell.font = { size: 11, color: { argb: SHEET_TEMPLATE_CONTRACT.bodyTextColor } };
      styleCellBorder(cell);
    });

    worksheetRow.height = 20;
  });
}

function applyTemplateContract(
  workbook: Workbook,
  options: {
    sheetName: string;
    title: string;
    subtitle: string;
    rows: AllocationOutputRow[];
    metadata: TemplateMetadataEntry[];
  },
) {
  const worksheet = workbook.addWorksheet(sanitizeSheetName(options.sheetName));
  const worksheetRows = toWorksheetRows(options.rows);

  worksheet.views = [{ state: "frozen", ySplit: SHEET_TEMPLATE_CONTRACT.headerRowNumber }];
  worksheet.pageSetup = SHEET_TEMPLATE_CONTRACT.pageSetup;

  applySheetFrame(worksheet, options.title, options.subtitle, options.metadata);
  applyHeaderRow(worksheet);
  applyDataRows(worksheet, worksheetRows);

  worksheet.autoFilter = {
    from: { row: SHEET_TEMPLATE_CONTRACT.headerRowNumber, column: 1 },
    to: { row: SHEET_TEMPLATE_CONTRACT.headerRowNumber, column: SHEET_TEMPLATE_CONTRACT.totalColumns },
  };
}

export async function exportAllocationWorkbook(
  run: Pick<EditableAllocationRun, "rooms">,
  options?: ExportAllocationWorkbookOptions,
): Promise<ExportAllocationWorkbookResult> {
  const workbook = new Workbook();
  const rows = projectOutputRecords(run);
  const filteredRows =
    typeof options?.roomNumber === "number"
      ? rows.filter((row) => row.roomNumber === options.roomNumber)
      : rows;
  const roomNumbers = [...new Set(rows.map((row) => row.roomNumber))].sort(
    (left, right) => left - right,
  );
  const targetRoomNumbers =
    typeof options?.roomNumber === "number" ? [options.roomNumber] : roomNumbers;
  const exportMode: ExportMode =
    typeof options?.roomNumber === "number" ? resolveRoomOnlyExportMode() : "full_workbook";

  workbook.creator = "ExamRoomAllocator";
  workbook.company = "ExamRoomAllocator";
  workbook.subject = "Phan phong thi";
  workbook.title = "Danh sach phan phong thi";
  workbook.keywords = `${TEMPLATE_VERSION};${exportMode}`;
  workbook.comments = `templateVersion=${TEMPLATE_VERSION};exportMode=${exportMode}`;

  if (typeof options?.roomNumber !== "number") {
    applyTemplateContract(workbook, {
      sheetName: "Tổng hợp",
      title: "DANH SÁCH PHÂN PHÒNG THI",
      subtitle: "Tổng hợp toàn bộ học viên sau khi phân phòng",
      rows: filteredRows,
      metadata: [
        { label: "Tổng học viên", value: filteredRows.length },
        { label: "Số phòng", value: roomNumbers.length },
        { label: "Nguồn dữ liệu", value: "Saved run authoritative" },
      ],
    });
  }

  targetRoomNumbers.forEach((roomNumber) => {
    const roomRows = filteredRows.filter((row) => row.roomNumber === roomNumber);

    applyTemplateContract(workbook, {
      sheetName: `Phòng ${String(roomNumber).padStart(2, "0")}`,
      title: `DANH SÁCH PHÒNG ${String(roomNumber).padStart(2, "0")}`,
      subtitle: "Danh sách học viên của phòng thi đã được chốt",
      rows: roomRows,
      metadata: [
        { label: "Phòng thi", value: `P${String(roomNumber).padStart(2, "0")}` },
        { label: "Sĩ số", value: roomRows.length },
        { label: "Chế độ xuất", value: exportMode },
      ],
    });
  });

  return {
    bytes: normalizeWorkbookBytes(await workbook.xlsx.writeBuffer()),
    templateVersion: TEMPLATE_VERSION,
    exportMode,
  };
}
