import { describe, expect, it } from "vitest";

import {
  CLASS_GROUPED_STRATEGY,
  assignClassGrouped,
} from "../../src/features/allocation/domain/assign-class-grouped";
import {
  EVEN_MIX_STRATEGY,
  assignEvenMix,
} from "../../src/features/allocation/domain/assign-even-mix";
import {
  REPRESENTATIVE_RATIO_STRATEGY,
  assignRepresentativeRatio,
} from "../../src/features/allocation/domain/assign-representative-ratio";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
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

function createRoster(): CanonicalStudentRecord[] {
  return [
    createStudent("MS001", "A1", "Nguyen Van An", 1),
    createStudent("MS002", "A1", "Nguyen Van Binh", 2),
    createStudent("MS003", "A1", "Nguyen Van Chau", 3),
    createStudent("MS004", "A2", "Tran Thi Dao", 4),
    createStudent("MS005", "A2", "Tran Thi Giang", 5),
    createStudent("MS006", "A2", "Tran Thi Ha", 6),
  ];
}

describe("allocation strategies", () => {
  it("distributes students round-robin for even_mix", () => {
    const rooms = assignEvenMix(createRoster(), buildRoomCapacities(6, 3));

    expect(rooms.map((room) => room.students.map((student) => student.canonical.studentCode))).toEqual([
      ["MS001", "MS004"],
      ["MS002", "MS005"],
      ["MS003", "MS006"],
    ]);
    expect(EVEN_MIX_STRATEGY).toBe("even_mix");
  });

  it("keeps canonical class groups together as much as possible for class_grouped", () => {
    const rooms = assignClassGrouped(createRoster(), buildRoomCapacities(6, 3));

    expect(rooms.map((room) => room.students.map((student) => student.canonical.className))).toEqual([
      ["A1", "A1"],
      ["A1", "A2"],
      ["A2", "A2"],
    ]);
    expect(CLASS_GROUPED_STRATEGY).toBe("class_grouped");
  });

  it("uses proportional quotas for representative_ratio", () => {
    const allocation = assignRepresentativeRatio(createRoster(), buildRoomCapacities(6, 3));
    const rooms = allocation.rooms;

    expect(rooms.map((room) => room.students.map((student) => student.canonical.className))).toEqual([
      ["A1", "A2"],
      ["A1", "A2"],
      ["A1", "A2"],
    ]);
    expect(REPRESENTATIVE_RATIO_STRATEGY).toBe("representative_ratio");
  });
});
