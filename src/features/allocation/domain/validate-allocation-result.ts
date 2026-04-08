import type {
  AllocationRoomResult,
  CanonicalStudentRecord,
  RoomCapacity,
} from "./allocation-types";

interface ValidateAllocationResultInput {
  expectedStudents: CanonicalStudentRecord[];
  roomCapacities: RoomCapacity[];
  rooms: AllocationRoomResult[];
}

function studentKey(student: CanonicalStudentRecord): string {
  return `${student.canonical.studentCode}:${student.rowIndex}`;
}

export function validateAllocationResult({
  expectedStudents,
  roomCapacities,
  rooms,
}: ValidateAllocationResultInput): void {
  const errors: string[] = [];
  const assignedStudents = rooms.flatMap((room) => room.students);
  const candidateNumbers = new Set<string>();
  const seenStudents = new Set<string>();

  if (rooms.length !== roomCapacities.length) {
    errors.push("room-count mismatch");
  }

  rooms.forEach((room, index) => {
    const expectedCapacity = roomCapacities[index];

    if (!expectedCapacity) {
      errors.push(`unexpected room ${room.roomNumber}`);
      return;
    }

    if (room.roomNumber !== expectedCapacity.roomNumber) {
      errors.push(`room-number mismatch for room ${room.roomNumber}`);
    }

    if (room.students.length > expectedCapacity.capacity) {
      errors.push(`room ${room.roomNumber} exceeds its capacity`);
    }

    if (room.students.length !== expectedCapacity.capacity) {
      errors.push(`room ${room.roomNumber} did not fill its target capacity`);
    }

    room.students.forEach((student) => {
      const key = studentKey(student);

      if (seenStudents.has(key)) {
        errors.push(`duplicate assignment for ${student.canonical.studentCode}`);
      }

      seenStudents.add(key);

      if (candidateNumbers.has(student.candidateNumber)) {
        errors.push(`duplicate candidate number ${student.candidateNumber}`);
      }

      candidateNumbers.add(student.candidateNumber);
    });
  });

  if (assignedStudents.length !== expectedStudents.length) {
    errors.push("missing assignments");
  }

  expectedStudents.forEach((student) => {
    if (!seenStudents.has(studentKey(student))) {
      errors.push(`missing student ${student.canonical.studentCode}`);
    }
  });

  const roomSizes = rooms.map((room) => room.students.length);
  const maxRoomSize = Math.max(...roomSizes);
  const minRoomSize = Math.min(...roomSizes);

  if (maxRoomSize - minRoomSize > 1) {
    errors.push("room size spread is greater than 1");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
