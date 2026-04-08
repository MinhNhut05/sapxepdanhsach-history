import { describe, expect, it } from "vitest";

import type { CanonicalStudentRecord } from "../../src/features/allocation/domain/allocation-types";
import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import {
  getManualEditStudentKey,
  projectManualEdits,
} from "../../src/features/allocation/domain/project-manual-edits";
import { validateManualEdits } from "../../src/features/allocation/domain/validate-manual-edits";

function createStudent(index: number, className = `A${(index % 2) + 1}`): CanonicalStudentRecord {
  const studentNumber = String(index + 1).padStart(3, "0");

  return {
    rowIndex: index + 1,
    raw: {
      className,
      studentCode: `MS${studentNumber}`,
      middleName: "Hoc Vien",
      firstName: studentNumber,
      birthDate: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    canonical: {
      className,
      studentCode: `MS${studentNumber}`,
      middleName: "Hoc Vien",
      firstName: studentNumber,
      fullName: `Hoc Vien ${studentNumber}`,
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    birthDateIso: "2001-01-01",
  };
}

describe("validateManualEdits", () => {
  it("reprojects room order and regenerates candidateNumber after a reorder", () => {
    const students = [
      createStudent(0),
      createStudent(1),
      createStudent(2),
      createStudent(3),
    ];
    const roomCapacities = buildRoomCapacities(students.length, 2);
    const projected = projectManualEdits({
      roomCapacities,
      students,
      rooms: [
        {
          roomNumber: 1,
          studentKeys: [
            getManualEditStudentKey(students[1]),
            getManualEditStudentKey(students[0]),
          ],
        },
        {
          roomNumber: 2,
          studentKeys: [
            getManualEditStudentKey(students[2]),
            getManualEditStudentKey(students[3]),
          ],
        },
      ],
    });
    const validation = validateManualEdits({
      expectedStudents: students,
      roomCapacities,
      rooms: projected.rooms,
      projectionIssues: projected.issues,
      summary: buildReviewSummary({ rooms: projected.rooms }),
    });

    expect(projected.rooms[0].students.map((student) => student.canonical.studentCode)).toEqual([
      "MS002",
      "MS001",
    ]);
    expect(projected.rooms[0].students.map((student) => student.candidateNumber)).toEqual([
      "P01-001",
      "P01-002",
    ]);
    expect(validation.blockingIssues).toHaveLength(0);
    expect(validation.warningIssues).toHaveLength(0);
  });

  it("returns a blocking issue when a manual edit drops a student", () => {
    const students = [
      createStudent(0),
      createStudent(1),
      createStudent(2),
      createStudent(3),
    ];
    const roomCapacities = buildRoomCapacities(students.length, 2);
    const projected = projectManualEdits({
      roomCapacities,
      students,
      rooms: [
        {
          roomNumber: 1,
          studentKeys: [
            getManualEditStudentKey(students[0]),
            getManualEditStudentKey(students[1]),
          ],
        },
        {
          roomNumber: 2,
          studentKeys: [getManualEditStudentKey(students[2])],
        },
      ],
    });

    const validation = validateManualEdits({
      expectedStudents: students,
      roomCapacities,
      rooms: projected.rooms,
      projectionIssues: projected.issues,
      summary: buildReviewSummary({ rooms: projected.rooms }),
    });

    expect(validation.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_student",
          message: expect.stringContaining("missing student"),
        }),
      ]),
    );
  });

  it("returns a warning when room size spread is greater than 1", () => {
    const students = [
      createStudent(0),
      createStudent(1),
      createStudent(2),
      createStudent(3),
    ];
    const roomCapacities = buildRoomCapacities(students.length, 2);
    const projected = projectManualEdits({
      roomCapacities,
      students,
      rooms: [
        {
          roomNumber: 1,
          studentKeys: [
            getManualEditStudentKey(students[0]),
            getManualEditStudentKey(students[1]),
            getManualEditStudentKey(students[2]),
          ],
        },
        {
          roomNumber: 2,
          studentKeys: [getManualEditStudentKey(students[3])],
        },
      ],
    });
    const summary = buildReviewSummary({ rooms: projected.rooms });
    const validation = validateManualEdits({
      expectedStudents: students,
      roomCapacities,
      rooms: projected.rooms,
      projectionIssues: projected.issues,
      summary,
    });

    expect(validation.blockingIssues).toHaveLength(0);
    expect(validation.warningIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "room size spread is greater than 1",
        }),
      ]),
    );
  });
});
