import { describe, expect, it } from "vitest";

import type { AllocationRoomResult } from "../../src/features/allocation/domain/allocation-types";
import { projectOutputRecords } from "../../src/features/allocation/server/project-output-records";

function createAllocatedStudent(
  roomNumber: number,
  seatIndex: number,
  studentNumber: string,
  overrides?: {
    middleName?: string;
    firstName?: string;
    note?: string | null;
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
      note: overrides?.note ?? null,
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
      note: overrides?.note ?? null,
    },
    birthDateIso: "2001-01-01",
    roomNumber,
    seatIndex,
    candidateNumber: `P${String(roomNumber).padStart(2, "0")}-${String(
      seatIndex,
    ).padStart(3, "0")}`,
  };
}

describe("projectOutputRecords", () => {
  it("flattens authoritative rooms into stable Phòng thi rows ordered by roomNumber then seatIndex", () => {
    const rooms: AllocationRoomResult[] = [
      {
        roomNumber: 2,
        capacity: 2,
        students: [createAllocatedStudent(2, 1, "003")],
      },
      {
        roomNumber: 1,
        capacity: 2,
        students: [
          createAllocatedStudent(1, 2, "002", {
            note: "Ghi chú A",
          }),
          createAllocatedStudent(1, 1, "001"),
        ],
      },
    ];

    const rows = projectOutputRecords({ rooms });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.candidateNumber)).toEqual([
      "P01-001",
      "P01-002",
      "P02-001",
    ]);
    expect(rows.map((row) => row.roomLabel)).toEqual([
      "Phòng 1",
      "Phòng 1",
      "Phòng 2",
    ]);
    expect(rows[1]).toMatchObject({
      roomNumber: 1,
      seatIndex: 2,
      className: "K19A",
      studentCode: "MS002",
      middleName: "Hoc Vien",
      firstName: "002",
      fullName: "Hoc Vien 002",
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: "Ghi chú A",
    });
  });
});
