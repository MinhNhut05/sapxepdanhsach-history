import type {
  AllocationRoomDraft,
  CanonicalStudentRecord,
  RoomCapacity,
} from "./allocation-types";
import { vietnameseCollator } from "@/features/roster/lib/normalize-vietnamese";
import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

export const CLASS_GROUPED_STRATEGY = "class_grouped";

function groupStudentsByCanonicalClassName(students: CanonicalStudentRecord[]) {
  const byClass = new Map<string, CanonicalStudentRecord[]>();

  for (const student of students) {
    const className = student.canonical.className;
    const group = byClass.get(className) ?? [];

    group.push(student);
    byClass.set(className, group);
  }

  return [...byClass.entries()]
    .sort(([left], [right]) => vietnameseCollator.compare(left, right))
    .map(([className, classStudents]) => ({
      className,
      students: sortStudentsByVietnameseName(classStudents),
    }));
}

export function assignClassGrouped(
  students: CanonicalStudentRecord[],
  roomCapacities: RoomCapacity[],
): AllocationRoomDraft[] {
  const rooms = roomCapacities.map((room) => ({
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    students: [] as CanonicalStudentRecord[],
  }));
  const classGroups = groupStudentsByCanonicalClassName(students);
  let roomIndex = 0;

  for (const group of classGroups) {
    for (const student of group.students) {
      while (
        roomIndex < rooms.length &&
        rooms[roomIndex]!.students.length >= rooms[roomIndex]!.capacity
      ) {
        roomIndex += 1;
      }

      const room = rooms[roomIndex];

      if (!room) {
        throw new Error("Not enough room capacity for class-grouped allocation");
      }

      room.students.push(student);
    }
  }

  return rooms;
}
