import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";

import type {
  AllocationRoomResult,
  EditableAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";
import {
  exportAllocationWorkbook,
} from "../../src/features/allocation/server/export-allocation-workbook";
import {
  SHEET_TEMPLATE_CONTRACT,
  TEMPLATE_VERSION,
} from "../../src/features/allocation/server/export-template-contract";
import { projectOutputRecords } from "../../src/features/allocation/server/project-output-records";

function createAllocatedStudent(
  roomNumber: number,
  seatIndex: number,
  studentNumber: string,
  overrides?: {
    middleName?: string;
    firstName?: string;
    fullName?: string;
  },
): AllocationRoomResult["students"][number] {
  return {
    rowIndex: Number(studentNumber),
    raw: {
      className: "K19A",
      studentCode: `MS${studentNumber}`,
      middleName: overrides?.middleName ?? "Hoc Vien",
      firstName: overrides?.firstName ?? studentNumber,
      birthDate: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    canonical: {
      className: "K19A",
      studentCode: `MS${studentNumber}`,
      middleName: overrides?.middleName ?? "Hoc Vien",
      firstName: overrides?.firstName ?? studentNumber,
      fullName:
        overrides?.fullName ??
        `${overrides?.middleName ?? "Hoc Vien"} ${overrides?.firstName ?? studentNumber}`,
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    birthDateIso: "2001-01-01",
    roomNumber,
    seatIndex,
    candidateNumber: `P${String(roomNumber).padStart(2, "0")}-${String(seatIndex).padStart(3, "0")}`,
  };
}

function createEditableRun(): Pick<EditableAllocationRun, "rooms"> {
  return {
    rooms: [
      {
        roomNumber: 1,
        capacity: 2,
        students: [
          createAllocatedStudent(1, 1, "002", {
            middleName: "Nguyen Van",
            firstName: "An",
            fullName: "FULL NAME SHOULD NOT DRIVE SPLIT",
          }),
          createAllocatedStudent(1, 2, "001", {
            middleName: "Tran Thi",
            firstName: "Binh",
          }),
        ],
      },
      {
        roomNumber: 2,
        capacity: 1,
        students: [createAllocatedStudent(2, 1, "003")],
      },
    ],
  };
}

function readRowValues(worksheet: Workbook["worksheets"][number], rowNumber: number) {
  const values = worksheet.getRow(rowNumber).values;

  return Array.isArray(values) ? values.slice(1) : Object.values(values);
}

describe("exportAllocationWorkbook", () => {
  it("creates template-locked sheets whose rows match the authoritative projection exactly", async () => {
    const savedRun = createEditableRun();
    const result = await exportAllocationWorkbook(savedRun);
    const workbook = new Workbook();
    const workbookInput = Buffer.from(
      result.bytes,
    ) as unknown as Parameters<Workbook["xlsx"]["load"]>[0];

    await workbook.xlsx.load(workbookInput);

    const masterSheet = workbook.getWorksheet("Tổng hợp");
    const roomSheet = workbook.getWorksheet("Phòng 01");
    const outputRows = projectOutputRecords(savedRun);

    expect(result.templateVersion).toBe(TEMPLATE_VERSION);
    expect(result.exportMode).toBe("full_workbook");
    expect(masterSheet).toBeDefined();
    expect(roomSheet).toBeDefined();
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Tổng hợp",
      "Phòng 01",
      "Phòng 02",
    ]);
    expect(masterSheet!.getCell("A1").value).toBe("DANH SÁCH PHÂN PHÒNG THI");
    expect(masterSheet!.getCell("A2").value).toBe("Tổng hợp toàn bộ học viên sau khi phân phòng");
    expect(masterSheet!.getCell("A3").value).toBe("Tổng học viên");
    expect(masterSheet!.getCell("B3").value).toBe(outputRows.length);
    expect(masterSheet!.getCell("D3").value).toBe("Số phòng");
    expect(masterSheet!.getCell("E3").value).toBe(2);
    expect(masterSheet!.getCell("G3").value).toBe("Nguồn dữ liệu");
    expect(masterSheet!.getCell("H3").value).toBe("Saved run authoritative");
    expect(masterSheet!.getRow(SHEET_TEMPLATE_CONTRACT.headerRowNumber).values).toBeDefined();
    expect(readRowValues(masterSheet!, SHEET_TEMPLATE_CONTRACT.headerRowNumber)).toEqual([
      "STT",
      "SBD",
      "HỌ LÓT",
      "TÊN",
      "NGÀY SINH",
      "LỚP",
      "MSHV",
      "NƠI SINH",
      "PHÒNG THI",
      "THỨ TỰ",
      "HỌ VÀ TÊN",
      "GHI CHÚ",
    ]);
    expect(masterSheet!.views[0]).toEqual(
      expect.objectContaining({ state: "frozen", ySplit: SHEET_TEMPLATE_CONTRACT.headerRowNumber }),
    );
    expect(masterSheet!.pageSetup.orientation).toBe("landscape");
    expect(masterSheet!.pageSetup.fitToWidth).toBe(1);
    expect(masterSheet!.pageSetup.fitToHeight).toBe(0);
    expect(masterSheet!.pageSetup.margins).toEqual(
      expect.objectContaining({ left: 0.35, right: 0.35, top: 0.45, bottom: 0.45 }),
    );
    expect(masterSheet!.getCell("A1").isMerged).toBe(true);
    expect(masterSheet!.getCell("A2").isMerged).toBe(true);
    expect(masterSheet!.getRow(6).getCell(2).value).toBe(outputRows[0].candidateNumber);
    expect(masterSheet!.getRow(6).getCell(3).value).toBe("Nguyen Van");
    expect(masterSheet!.getRow(6).getCell(4).value).toBe("An");
    expect(masterSheet!.getRow(6).getCell(11).value).toBe("FULL NAME SHOULD NOT DRIVE SPLIT");
    expect(masterSheet!.getRow(6).getCell(5).value).toBe("01/01/2001");
    expect(roomSheet!.getCell("A1").value).toBe("DANH SÁCH PHÒNG 01");
    expect(roomSheet!.getCell("A3").value).toBe("Phòng thi");
    expect(roomSheet!.getCell("G3").value).toBe("Chế độ xuất");
    expect(roomSheet!.getCell("H3").value).toBe("full_workbook");
    expect(roomSheet!.getRow(6).getCell(2).value).toBe("P01-001");
    expect(roomSheet!.getRow(7).getCell(2).value).toBe("P01-002");
    expect(roomSheet!.getRow(6).getCell(7).value).toBe("MS002");
    expect(roomSheet!.getRow(7).getCell(7).value).toBe("MS001");
  });

  it("uses deterministic full-template-single-room fallback when room-only template is unavailable", async () => {
    const savedRun = createEditableRun();
    const result = await exportAllocationWorkbook(savedRun, { roomNumber: 1 });
    const workbook = new Workbook();

    await workbook.xlsx.load(Buffer.from(result.bytes) as unknown as Parameters<Workbook["xlsx"]["load"]>[0]);

    expect(result.templateVersion).toBe(TEMPLATE_VERSION);
    expect(result.exportMode).toBe("full_template_single_room_fallback");
    expect(workbook.getWorksheet("Tổng hợp")).toBeUndefined();
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Phòng 01"]);
    expect(workbook.getWorksheet("Phòng 01")!.getCell("H3").value).toBe(
      "full_template_single_room_fallback",
    );
    expect(workbook.getWorksheet("Phòng 01")!.views[0]).toEqual(
      expect.objectContaining({ state: "frozen", ySplit: SHEET_TEMPLATE_CONTRACT.headerRowNumber }),
    );
  });
});
