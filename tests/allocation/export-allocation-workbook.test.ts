import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";

import type {
  AllocationRoomResult,
  EditableAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";
import { exportAllocationWorkbook } from "../../src/features/allocation/server/export-allocation-workbook";
import { projectOutputRecords } from "../../src/features/allocation/server/project-output-records";

function createAllocatedStudent(
  roomNumber: number,
  seatIndex: number,
  studentNumber: string,
  overrides?: {
    middleName?: string;
    firstName?: string;
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
      fullName: `${overrides?.middleName ?? "Hoc Vien"} ${
        overrides?.firstName ?? studentNumber
      }`,
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    birthDateIso: "2001-01-01",
    roomNumber,
    seatIndex,
    candidateNumber: `P${String(roomNumber).padStart(2, "0")}-${String(
      seatIndex,
    ).padStart(3, "0")}`,
  };
}

function createEditableRun(): Pick<EditableAllocationRun, "rooms"> {
  return {
    rooms: [
      {
        roomNumber: 1,
        capacity: 2,
        students: [
          createAllocatedStudent(1, 1, "002"),
          createAllocatedStudent(1, 2, "001"),
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
  it("creates Tổng hợp and per-room sheets whose rows match the authoritative projection exactly", async () => {
    const savedRun = createEditableRun();
    const workbookBytes = await exportAllocationWorkbook(savedRun);
    const workbook = new Workbook();
    const workbookInput = Buffer.from(
      workbookBytes,
    ) as unknown as Parameters<Workbook["xlsx"]["load"]>[0];

    await workbook.xlsx.load(workbookInput);

    const masterSheet = workbook.getWorksheet("Tổng hợp");
    const roomSheet = workbook.getWorksheet("Phòng 01");
    const outputRows = projectOutputRecords(savedRun);

    expect(masterSheet).toBeDefined();
    expect(roomSheet).toBeDefined();
    expect(readRowValues(masterSheet!, 1)).toEqual([
      "Phòng thi",
      "Số báo danh",
      "Thứ tự trong phòng",
      "Lớp",
      "MSHV",
      "HỌ LÓT",
      "TÊN",
      "NGÀY SINH",
      "NƠI SINH",
      "GHI CHÚ",
    ]);
    expect(masterSheet!.views[0]).toEqual(
      expect.objectContaining({ state: "frozen", ySplit: 1 }),
    );
    expect(masterSheet!.getRow(2).getCell(2).value).toBe(outputRows[0].candidateNumber);
    expect(masterSheet!.getRow(3).getCell(2).value).toBe(outputRows[1].candidateNumber);
    expect(roomSheet!.getRow(2).getCell(2).value).toBe("P01-001");
    expect(roomSheet!.getRow(3).getCell(2).value).toBe("P01-002");
    expect(roomSheet!.getRow(2).getCell(5).value).toBe("MS002");
    expect(roomSheet!.getRow(3).getCell(5).value).toBe("MS001");
  });
});
