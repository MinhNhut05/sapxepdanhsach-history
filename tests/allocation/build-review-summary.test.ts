import { describe, expect, it } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import type { CanonicalStudentRecord } from "../../src/features/allocation/domain/allocation-types";

function createStudent(index: number, className: string): CanonicalStudentRecord {
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

describe("buildReviewSummary", () => {
  it("computes classDistribution, room breakdowns, and room size warnings", () => {
    const students = [
      createStudent(0, "A1"),
      createStudent(1, "A1"),
      createStudent(2, "B1"),
      createStudent(3, "C1"),
    ];
    const rooms = generateCandidateNumbers(
      [
        {
          roomNumber: 1,
          capacity: 2,
          students: [students[0], students[2], students[3]],
        },
        {
          roomNumber: 2,
          capacity: 2,
          students: [students[1]],
        },
      ],
      {
        preserveStudentOrder: true,
      },
    );

    const summary = buildReviewSummary({ rooms });

    expect(summary.totalStudents).toBe(4);
    expect(summary.roomSizeBuckets).toEqual([
      {
        size: 3,
        roomCount: 1,
        roomNumbers: [1],
      },
      {
        size: 1,
        roomCount: 1,
        roomNumbers: [2],
      },
    ]);
    expect(summary.roomClassBreakdown[0]).toMatchObject({
      roomNumber: 1,
      dominantClassName: "A1",
      studentCount: 3,
    });
    expect(summary.classDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: "A1",
          roomCoverage: 2,
          dominantRoomSharePercent: 50,
        }),
      ]),
    );
    expect(summary.warnings).toEqual([
      expect.objectContaining({
        code: "room_size_spread",
        message: "room size spread is greater than 1",
      }),
    ]);
  });

  it("surfaces fairness feasibility and class spread diagnostics", () => {
    const students = [
      createStudent(0, "A1"),
      createStudent(1, "A1"),
      createStudent(2, "A1"),
      createStudent(3, "B1"),
    ];
    const rooms = generateCandidateNumbers(
      [
        {
          roomNumber: 1,
          capacity: 2,
          students: [students[0], students[1]],
        },
        {
          roomNumber: 2,
          capacity: 2,
          students: [students[2], students[3]],
        },
      ],
      {
        preserveStudentOrder: true,
      },
    );

    const summary = buildReviewSummary({
      rooms,
      fairnessFeasibility: {
        strategy: "representative_ratio",
        strictClassSpreadTarget: 1,
        feasible: true,
        fallbackApplied: false,
        reasonCode: null,
        reason: null,
      },
      validation: {
        fairnessFeasibility: {
          strategy: "representative_ratio",
          strictClassSpreadTarget: 1,
          feasible: true,
          fallbackApplied: false,
          reasonCode: null,
          reason: null,
        },
        classSpreadByClass: [
          {
            className: "A1",
            totalStudents: 3,
            expectedMinPerRoom: 1,
            expectedMaxPerRoom: 2,
            minCount: 1,
            maxCount: 2,
            spread: 1,
            rooms: [
              { roomNumber: 1, count: 2 },
              { roomNumber: 2, count: 1 },
            ],
          },
        ],
        classSpreadViolations: [],
      },
    });

    expect(summary.fairnessFeasibility).toMatchObject({
      feasible: true,
      fallbackApplied: false,
    });
    expect(summary.classSpreadByClass).toEqual([
      expect.objectContaining({
        className: "A1",
        spread: 1,
        expectedMinPerRoom: 1,
        expectedMaxPerRoom: 2,
      }),
    ]);
    expect(summary.classSpreadViolations).toEqual([]);
  });
});
