import type {
  AllocationRoomResult,
  CanonicalStudentRecord,
  ManualEditRoomPayload,
  RoomCapacity,
} from "./allocation-types";
import { generateCandidateNumbers } from "./generate-candidate-numbers";

export interface ProjectManualEditsIssues {
  duplicateRoomNumbers: number[];
  unexpectedRoomNumbers: number[];
  unknownStudentKeys: string[];
}

export interface ProjectManualEditsResult {
  rooms: AllocationRoomResult[];
  issues: ProjectManualEditsIssues;
}

interface ProjectManualEditsInput {
  roomCapacities: RoomCapacity[];
  students: CanonicalStudentRecord[];
  rooms: ManualEditRoomPayload[];
}

export function getManualEditStudentKey(
  student: Pick<CanonicalStudentRecord, "rowIndex" | "canonical">,
): string {
  return `${student.canonical.studentCode}:${student.rowIndex}`;
}

export function projectManualEdits({
  roomCapacities,
  students,
  rooms,
}: ProjectManualEditsInput): ProjectManualEditsResult {
  const capacityByRoom = new Map(
    roomCapacities.map((roomCapacity) => [roomCapacity.roomNumber, roomCapacity]),
  );
  const studentByKey = new Map(
    students.map((student) => [getManualEditStudentKey(student), student]),
  );
  const roomPayloadByNumber = new Map<number, ManualEditRoomPayload>();
  const duplicateRoomNumbers = new Set<number>();
  const unexpectedRoomNumbers = new Set<number>();
  const unknownStudentKeys = new Set<string>();

  rooms.forEach((room) => {
    if (!capacityByRoom.has(room.roomNumber)) {
      unexpectedRoomNumbers.add(room.roomNumber);
    }

    if (roomPayloadByNumber.has(room.roomNumber)) {
      duplicateRoomNumbers.add(room.roomNumber);
    }

    roomPayloadByNumber.set(room.roomNumber, room);
  });

  const projectedRooms = generateCandidateNumbers(
    roomCapacities.map((roomCapacity) => {
      const payloadRoom = roomPayloadByNumber.get(roomCapacity.roomNumber);

      return {
        roomNumber: roomCapacity.roomNumber,
        capacity: roomCapacity.capacity,
        students:
          payloadRoom?.studentKeys.flatMap((studentKey) => {
            const student = studentByKey.get(studentKey);

            if (!student) {
              unknownStudentKeys.add(studentKey);
              return [];
            }

            return [student];
          }) ?? [],
      };
    }),
    {
      preserveStudentOrder: true,
    },
  );

  return {
    rooms: projectedRooms,
    issues: {
      duplicateRoomNumbers: [...duplicateRoomNumbers].sort((left, right) => left - right),
      unexpectedRoomNumbers: [...unexpectedRoomNumbers].sort((left, right) => left - right),
      unknownStudentKeys: [...unknownStudentKeys].sort(),
    },
  };
}
