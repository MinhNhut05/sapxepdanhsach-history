import type {
  AllocationRoomResult,
  AllocationValidationResult,
  CanonicalStudentRecord,
  ClassSpreadMetric,
  ClassSpreadViolation,
  FairnessFeasibility,
  RoomCapacity,
} from "./allocation-types";

interface ValidateAllocationResultInput {
  expectedStudents: CanonicalStudentRecord[];
  roomCapacities: RoomCapacity[];
  rooms: AllocationRoomResult[];
  fairnessFeasibility?: FairnessFeasibility | null;
}

function studentKey(student: CanonicalStudentRecord): string {
  return `${student.canonical.studentCode}:${student.rowIndex}`;
}

function buildClassSpreadByClass(
  rooms: AllocationRoomResult[],
): ClassSpreadMetric[] {
  const classNames = [...new Set(
    rooms.flatMap((room) => room.students.map((student) => student.canonical.className)),
  )].sort((left, right) => left.localeCompare(right, "vi"));

  return classNames.map((className) => {
    const roomMetrics = rooms.map((room) => ({
      roomNumber: room.roomNumber,
      count: room.students.filter(
        (student) => student.canonical.className === className,
      ).length,
    }));
    const counts = roomMetrics.map((room) => room.count);
    const totalStudents = counts.reduce((sum, count) => sum + count, 0);
    const expectedMinPerRoom = Math.floor(totalStudents / rooms.length);
    const expectedMaxPerRoom = Math.ceil(totalStudents / rooms.length);
    const minCount = counts.length > 0 ? Math.min(...counts) : 0;
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

    return {
      className,
      totalStudents,
      expectedMinPerRoom,
      expectedMaxPerRoom,
      minCount,
      maxCount,
      spread: maxCount - minCount,
      rooms: roomMetrics,
    };
  });
}

function buildClassSpreadViolations(
  classSpreadByClass: ClassSpreadMetric[],
  fairnessFeasibility: FairnessFeasibility | null,
): ClassSpreadViolation[] {
  if (!fairnessFeasibility?.feasible) {
    return [];
  }

  return classSpreadByClass
    .filter((entry) => entry.spread > 1)
    .map((entry) => ({
      className: entry.className,
      code: "strict_class_spread_exceeded",
      message: `Lớp ${entry.className} có độ lệch phân bổ ${entry.spread}, vượt quá ngưỡng <= 1.`,
      expectedMinPerRoom: entry.expectedMinPerRoom,
      expectedMaxPerRoom: entry.expectedMaxPerRoom,
      actualMinCount: entry.minCount,
      actualMaxCount: entry.maxCount,
      spread: entry.spread,
    }));
}

export function validateAllocationResult({
  expectedStudents,
  roomCapacities,
  rooms,
  fairnessFeasibility = null,
}: ValidateAllocationResultInput): AllocationValidationResult {
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

  const classSpreadByClass = buildClassSpreadByClass(rooms);
  const classSpreadViolations = buildClassSpreadViolations(
    classSpreadByClass,
    fairnessFeasibility,
  );

  if (classSpreadViolations.length > 0 && fairnessFeasibility?.feasible) {
    errors.push(
      ...classSpreadViolations.map(
        (violation) => `${violation.className} spread is greater than 1`,
      ),
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    classSpreadByClass,
    classSpreadViolations,
    fairnessFeasibility,
  };
}
