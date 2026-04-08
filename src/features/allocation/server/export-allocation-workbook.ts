import { Workbook } from "exceljs";

import type {
  AllocationOutputRow,
  EditableAllocationRun,
} from "../domain/allocation-types";

import { projectOutputRecords } from "./project-output-records";

const ALLOCATION_WORKBOOK_COLUMNS = [
  { header: "Phòng thi", key: "roomLabel", width: 14 },
  { header: "Số báo danh", key: "candidateNumber", width: 16 },
  { header: "Thứ tự trong phòng", key: "seatIndex", width: 18 },
  { header: "Lớp", key: "className", width: 14 },
  { header: "MSHV", key: "studentCode", width: 16 },
  { header: "HỌ LÓT", key: "middleName", width: 22 },
  { header: "TÊN", key: "firstName", width: 18 },
  { header: "NGÀY SINH", key: "birthDateIso", width: 14 },
  { header: "NƠI SINH", key: "birthPlace", width: 20 },
  { header: "GHI CHÚ", key: "note", width: 18 },
] as const;

type WorkbookColumnKey = (typeof ALLOCATION_WORKBOOK_COLUMNS)[number]["key"];

function toWorksheetRow(row: AllocationOutputRow): Record<WorkbookColumnKey, string | number> {
  return {
    roomLabel: row.roomLabel,
    candidateNumber: row.candidateNumber,
    seatIndex: row.seatIndex,
    className: row.className,
    studentCode: row.studentCode,
    middleName: row.middleName,
    firstName: row.firstName,
    birthDateIso: row.birthDateIso,
    birthPlace: row.birthPlace,
    note: row.note ?? "",
  };
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

function appendSheetRows(
  workbook: Workbook,
  sheetName: string,
  rows: AllocationOutputRow[],
) {
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName));

  worksheet.columns = ALLOCATION_WORKBOOK_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    worksheet.addRow(toWorksheetRow(row));
  });
}

export async function exportAllocationWorkbook(
  run: Pick<EditableAllocationRun, "rooms">,
): Promise<Uint8Array> {
  const workbook = new Workbook();
  const rows = projectOutputRecords(run);

  workbook.creator = "ExamRoomAllocator";
  appendSheetRows(workbook, "Tổng hợp", rows);

  const roomNumbers = [...new Set(rows.map((row) => row.roomNumber))].sort(
    (left, right) => left - right,
  );

  roomNumbers.forEach((roomNumber) => {
    appendSheetRows(
      workbook,
      `Phòng ${String(roomNumber).padStart(2, "0")}`,
      rows.filter((row) => row.roomNumber === roomNumber),
    );
  });

  return normalizeWorkbookBytes(await workbook.xlsx.writeBuffer());
}
