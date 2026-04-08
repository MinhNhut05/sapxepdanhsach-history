import { describe, expect, it } from "vitest";

import { createAllocationRun } from "../../src/features/allocation/domain/create-allocation-run";
import type { CanonicalStudentRecord } from "../../src/features/allocation/domain/allocation-types";

function createStudent(
  studentCode: string,
  className: string,
  fullName: string,
  rowIndex: number,
): CanonicalStudentRecord {
  const [firstName, ...rest] = fullName.split(" ").reverse();
  const middleName = rest.reverse().join(" ");

  return {
    rowIndex,
    raw: {
      className,
      studentCode,
      middleName,
      firstName,
      birthDate: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    canonical: {
      className,
      studentCode,
      middleName,
      firstName,
      fullName,
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    birthDateIso: "2001-01-01",
  };
}

function createK19ABaselineRoster(): CanonicalStudentRecord[] {
  const classNames = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"];

  return Array.from({ length: 272 }, (_, index) => {
    const className = classNames[index % classNames.length]!;
    const studentNumber = String(index + 1).padStart(3, "0");

    return createStudent(
      `MS${studentNumber}`,
      className,
      `Hoc Vien ${studentNumber}`,
      index + 1,
    );
  });
}

describe("createAllocationRun", () => {
  it("returns identical results for repeated runs with the same settings", () => {
    const students = createK19ABaselineRoster();

    const firstRun = createAllocationRun({
      students,
      roomCount: 13,
      strategy: "even_mix",
    });
    const secondRun = createAllocationRun({
      students,
      roomCount: 13,
      strategy: "even_mix",
    });

    expect(secondRun).toEqual(firstRun);
  });

  it("generates Pxx-yyy candidate numbers after per-room canonical sorting", () => {
    const result = createAllocationRun({
      students: createK19ABaselineRoster(),
      roomCount: 13,
      strategy: "class_grouped",
    });

    expect(result.rooms[0]?.students[0]?.candidateNumber).toMatch(/^P\d{2}-\d{3}$/);
    expect(result.rooms.flatMap((room) => room.students).every((student) => /^P\d{2}-\d{3}$/.test(student.candidateNumber))).toBe(true);
  });

  it("preserves the K19A baseline room-size distribution for 272 students and 13 rooms", () => {
    const result = createAllocationRun({
      students: createK19ABaselineRoster(),
      roomCount: 13,
      strategy: "representative_ratio",
    });
    const roomSizes = result.rooms.map((room) => room.students.length);

    expect(roomSizes.filter((size) => size === 21)).toHaveLength(12);
    expect(roomSizes.filter((size) => size === 20)).toHaveLength(1);
    expect(result.summary.sizeSpread).toBeLessThanOrEqual(1);
  });
});
