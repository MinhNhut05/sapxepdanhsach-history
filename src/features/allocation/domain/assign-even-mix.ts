import type {
  AllocationRoomDraft,
  CanonicalStudentRecord,
  RoomCapacity,
} from "./allocation-types";

export const EVEN_MIX_STRATEGY = "even_mix";

export function assignEvenMix(
  students: CanonicalStudentRecord[],
  roomCapacities: RoomCapacity[],
): AllocationRoomDraft[] {
  const rooms = roomCapacities.map((room) => ({
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    students: [] as CanonicalStudentRecord[],
  }));

  for (const [index, student] of students.entries()) {
    const roomIndex = index % roomCapacities.length;
    rooms[roomIndex]?.students.push(student);
  }

  return rooms;
}
