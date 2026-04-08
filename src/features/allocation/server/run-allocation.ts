import { createHash } from "node:crypto";

import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

import { createAllocationRun } from "../domain/create-allocation-run";
import type { PreparedAllocationRun } from "../domain/allocation-types";
import { buildRoomCapacities } from "../domain/build-room-capacities";

import {
  allocationRequestSchema,
  MAX_ALLOCATION_STUDENTS,
  type AllocationRequestInput,
} from "./allocation-request";

export const ALLOCATION_ALGORITHM_VERSION = "allocation-engine/v1";

export class AllocationRouteError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 422,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AllocationRouteError";
  }
}

function toStableRosterFingerprint(students: AllocationRequestInput["students"]): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        students.map((student) => ({
          rowIndex: student.rowIndex,
          className: student.canonical.className,
          studentCode: student.canonical.studentCode,
          middleName: student.canonical.middleName,
          firstName: student.canonical.firstName,
          birthDateIso: student.canonical.birthDateIso,
          birthPlace: student.canonical.birthPlace,
          note: student.canonical.note ?? null,
        })),
      ),
    )
    .digest("hex");
}

export function runAllocation(input: unknown): PreparedAllocationRun {
  const parsed = allocationRequestSchema.safeParse(input);

  if (!parsed.success) {
    const studentsLimitIssue = parsed.error.issues.find(
      (issue) =>
        issue.code === "too_big" &&
        issue.path[0] === "students" &&
        issue.maximum === MAX_ALLOCATION_STUDENTS,
    );

    if (studentsLimitIssue) {
      throw new AllocationRouteError(
        `students cannot exceed ${MAX_ALLOCATION_STUDENTS} records`,
        413,
        "students_limit_exceeded",
        {
          limit: MAX_ALLOCATION_STUDENTS,
        },
      );
    }

    throw new AllocationRouteError(
      "Malformed allocation payload",
      400,
      "malformed_payload",
      parsed.error.flatten(),
    );
  }

  const request = parsed.data;

  if (request.roomCount > request.students.length) {
    throw new AllocationRouteError(
      "roomCount cannot exceed the student count",
      422,
      "room_count_exceeds_students",
    );
  }

  const roomCapacities = buildRoomCapacities(
    request.students.length,
    request.roomCount,
  );

  if (Math.max(...roomCapacities.map((room) => room.capacity)) > 999) {
    throw new AllocationRouteError(
      "room capacity cannot exceed 999 seats",
      422,
      "room_capacity_exceeds_candidate_limit",
    );
  }

  const canonicalStudents = sortStudentsByVietnameseName(request.students);
  const resultSnapshot = createAllocationRun({
    students: canonicalStudents,
    roomCount: request.roomCount,
    strategy: request.strategy,
  });
  const sourceSheetName = request.sourceSheetName ?? null;

  return {
    sourceFileName: request.sourceFileName,
    sourceSheetName,
    roomCount: request.roomCount,
    strategy: request.strategy,
    students: canonicalStudents,
    totalStudents: canonicalStudents.length,
    algorithmVersion: ALLOCATION_ALGORITHM_VERSION,
    rosterFingerprint: toStableRosterFingerprint(canonicalStudents),
    inputSnapshot: {
      sourceFileName: request.sourceFileName,
      sourceSheetName,
      roomCount: request.roomCount,
      strategy: request.strategy,
      students: canonicalStudents,
    },
    resultSnapshot,
    summary: resultSnapshot.summary,
  };
}
