import type {
  AllocationRoomResult,
  AllocationWarning,
  CanonicalStudentRecord,
  ReviewSummary,
  RoomCapacity,
} from "./allocation-types";
import { buildReviewSummary } from "./build-review-summary";
import type { ProjectManualEditsIssues } from "./project-manual-edits";

interface ValidateManualEditsInput {
  expectedStudents: CanonicalStudentRecord[];
  roomCapacities: RoomCapacity[];
  rooms: AllocationRoomResult[];
  projectionIssues?: Partial<ProjectManualEditsIssues>;
  summary?: ReviewSummary;
}

export interface ManualEditValidationResult {
  blockingIssues: AllocationWarning[];
  warningIssues: AllocationWarning[];
}

function getStudentKey(student: CanonicalStudentRecord): string {
  return `${student.canonical.studentCode}:${student.rowIndex}`;
}

export function validateManualEdits({
  expectedStudents,
  roomCapacities,
  rooms,
  projectionIssues,
  summary,
}: ValidateManualEditsInput): ManualEditValidationResult {
  const blockingIssues: AllocationWarning[] = [];
  const roomCapacityByNumber = new Map(
    roomCapacities.map((roomCapacity) => [roomCapacity.roomNumber, roomCapacity]),
  );
  const expectedStudentKeys = new Set(expectedStudents.map((student) => getStudentKey(student)));
  const seenStudentKeys = new Set<string>();
  const candidateNumbers = new Set<string>();

  projectionIssues?.duplicateRoomNumbers?.forEach((roomNumber) => {
    blockingIssues.push({
      severity: "blocking",
      code: "duplicate_room_number",
      message: `duplicate room payload for room ${roomNumber}`,
      roomNumber,
    });
  });

  projectionIssues?.unexpectedRoomNumbers?.forEach((roomNumber) => {
    blockingIssues.push({
      severity: "blocking",
      code: "unexpected_room_number",
      message: `manual edits reference unknown room ${roomNumber}`,
      roomNumber,
    });
  });

  projectionIssues?.unknownStudentKeys?.forEach((studentKey) => {
    blockingIssues.push({
      severity: "blocking",
      code: "unknown_student_key",
      message: `manual edits reference unknown student key ${studentKey}`,
      studentKey,
    });
  });

  rooms.forEach((room) => {
    const expectedRoom = roomCapacityByNumber.get(room.roomNumber);

    if (!expectedRoom) {
      blockingIssues.push({
        severity: "blocking",
        code: "unknown_room",
        message: `manual edits produced an impossible room reference ${room.roomNumber}`,
        roomNumber: room.roomNumber,
      });
      return;
    }

    room.students.forEach((student) => {
      const studentKey = getStudentKey(student);

      if (!expectedStudentKeys.has(studentKey)) {
        blockingIssues.push({
          severity: "blocking",
          code: "unknown_student_assignment",
          message: `manual edits assigned an unknown student ${student.canonical.studentCode}`,
          roomNumber: room.roomNumber,
          studentKey,
        });
      }

      if (seenStudentKeys.has(studentKey)) {
        blockingIssues.push({
          severity: "blocking",
          code: "duplicate_student",
          message: `duplicate student ${student.canonical.studentCode} in manual edits`,
          roomNumber: room.roomNumber,
          studentKey,
        });
      }

      seenStudentKeys.add(studentKey);

      if (candidateNumbers.has(student.candidateNumber)) {
        blockingIssues.push({
          severity: "blocking",
          code: "duplicate_candidate_number",
          message: `duplicate candidate number ${student.candidateNumber}`,
          roomNumber: room.roomNumber,
          studentKey,
        });
      }

      candidateNumbers.add(student.candidateNumber);
    });
  });

  expectedStudents.forEach((student) => {
    const studentKey = getStudentKey(student);

    if (!seenStudentKeys.has(studentKey)) {
      blockingIssues.push({
        severity: "blocking",
        code: "missing_student",
        message: `missing student ${student.canonical.studentCode} from manual edits`,
        studentKey,
      });
    }
  });

  const resolvedSummary = summary ?? buildReviewSummary({ rooms });

  return {
    blockingIssues,
    warningIssues: resolvedSummary.warnings,
  };
}
