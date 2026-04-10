import { describe, expect, it } from "vitest";

import { assignRepresentativeRatio } from "../../src/features/allocation/domain/assign-representative-ratio";
import { createAllocationRun } from "../../src/features/allocation/domain/create-allocation-run";
import type {
  CanonicalStudentRecord,
  RoomCapacity,
} from "../../src/features/allocation/domain/allocation-types";

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

function createFeasibleRoster(): CanonicalStudentRecord[] {
  return [
    createStudent("MS001", "A1", "Hoc Vien 001", 1),
    createStudent("MS002", "A1", "Hoc Vien 002", 2),
    createStudent("MS003", "A1", "Hoc Vien 003", 3),
    createStudent("MS004", "B1", "Hoc Vien 004", 4),
    createStudent("MS005", "B1", "Hoc Vien 005", 5),
    createStudent("MS006", "B1", "Hoc Vien 006", 6),
  ];
}

function createInfeasibleRoster(): CanonicalStudentRecord[] {
  return [
    createStudent("MS001", "A1", "Hoc Vien 001", 1),
    createStudent("MS002", "A1", "Hoc Vien 002", 2),
    createStudent("MS003", "A1", "Hoc Vien 003", 3),
    createStudent("MS004", "B1", "Hoc Vien 004", 4),
    createStudent("MS005", "B1", "Hoc Vien 005", 5),
  ];
}

function spreadByClass(result: ReturnType<typeof createAllocationRun>) {
  return new Map(
    result.summary.classSpreadByClass.map((entry) => [entry.className, entry.spread]),
  );
}

describe("strict class fairness", () => {
  it("keeps per-class spread <= 1 when strict fairness is feasible", () => {
    const result = createAllocationRun({
      students: createFeasibleRoster(),
      roomCount: 3,
      strategy: "representative_ratio",
    });

    expect(result.summary.fairnessFeasibility).toMatchObject({
      feasible: true,
      fallbackApplied: false,
      reasonCode: null,
    });
    expect([...spreadByClass(result).values()].every((spread) => spread <= 1)).toBe(true);
    expect(result.summary.classSpreadViolations).toEqual([]);
  });

  it("returns deterministic fallback metadata when strict fairness is infeasible under custom capacities", () => {
    const roomCapacities: RoomCapacity[] = [
      { roomNumber: 1, capacity: 3 },
      { roomNumber: 2, capacity: 1 },
      { roomNumber: 3, capacity: 1 },
    ];

    const firstRun = assignRepresentativeRatio(createInfeasibleRoster(), roomCapacities);
    const secondRun = assignRepresentativeRatio(createInfeasibleRoster(), roomCapacities);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun.fairnessFeasibility).toMatchObject({
      feasible: false,
      fallbackApplied: true,
      reasonCode: "strict_fairness_infeasible",
    });
    expect(firstRun.rooms.map((room) => room.students.length)).toEqual([3, 1, 1]);
  });
});
