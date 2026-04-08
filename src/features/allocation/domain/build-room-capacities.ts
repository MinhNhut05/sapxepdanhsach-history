import type { RoomCapacity } from "./allocation-types";

export function buildRoomCapacities(
  totalStudents: number,
  roomCount: number,
): RoomCapacity[] {
  if (!Number.isInteger(totalStudents) || totalStudents < 1) {
    throw new Error("totalStudents must be a positive integer");
  }

  if (!Number.isInteger(roomCount) || roomCount < 1) {
    throw new Error("roomCount must be a positive integer");
  }

  if (roomCount > totalStudents) {
    throw new Error("roomCount cannot exceed totalStudents");
  }

  const base = Math.floor(totalStudents / roomCount);
  const remainder = totalStudents % roomCount;

  return Array.from({ length: roomCount }, (_, index) => ({
    roomNumber: index + 1,
    capacity: index < remainder ? base + 1 : base,
  }));
}
