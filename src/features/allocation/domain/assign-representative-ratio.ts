import type {
  AllocationRoomDraft,
  CanonicalStudentRecord,
  RoomCapacity,
} from "./allocation-types";
import { vietnameseCollator } from "@/features/roster/lib/normalize-vietnamese";
import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

export const REPRESENTATIVE_RATIO_STRATEGY = "representative_ratio";

interface RemainingClassGroup {
  className: string;
  students: CanonicalStudentRecord[];
}

interface QuotaCandidate {
  className: string;
  index: number;
  baseSeats: number;
  remainder: number;
}

function buildRemainingClassGroups(
  students: CanonicalStudentRecord[],
): RemainingClassGroup[] {
  const byClass = new Map<string, CanonicalStudentRecord[]>();

  for (const student of students) {
    const className = student.canonical.className;
    const classStudents = byClass.get(className) ?? [];

    classStudents.push(student);
    byClass.set(className, classStudents);
  }

  return [...byClass.entries()]
    .sort(([left], [right]) => vietnameseCollator.compare(left, right))
    .map(([className, classStudents]) => ({
      className,
      students: sortStudentsByVietnameseName(classStudents),
    }));
}

function pickLargestRemainders(
  groups: RemainingClassGroup[],
  roomCapacity: number,
  remainingTotal: number,
): number[] {
  const quotaCandidates: QuotaCandidate[] = groups.map((group, index) => {
    const rawQuota = (group.students.length * roomCapacity) / remainingTotal;

    return {
      className: group.className,
      index,
      baseSeats: Math.floor(rawQuota),
      remainder: rawQuota - Math.floor(rawQuota),
    };
  });
  const seats = quotaCandidates.map((candidate, index) =>
    Math.min(candidate.baseSeats, groups[index]!.students.length),
  );
  let seatsLeft = roomCapacity - seats.reduce((sum, seatCount) => sum + seatCount, 0);

  quotaCandidates
    .filter((candidate) => groups[candidate.index]!.students.length > seats[candidate.index]!)
    .sort((left, right) => {
      if (right.remainder !== left.remainder) {
        return right.remainder - left.remainder;
      }

      return vietnameseCollator.compare(left.className, right.className);
    })
    .some((candidate) => {
      if (seatsLeft === 0) {
        return true;
      }

      seats[candidate.index] += 1;
      seatsLeft -= 1;

      return false;
    });

  return seats;
}

export function assignRepresentativeRatio(
  students: CanonicalStudentRecord[],
  roomCapacities: RoomCapacity[],
): AllocationRoomDraft[] {
  const rooms = roomCapacities.map((room) => ({
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    students: [] as CanonicalStudentRecord[],
  }));
  const remainingGroups = buildRemainingClassGroups(students);
  let remainingTotal = students.length;

  for (const room of rooms) {
    const seats = pickLargestRemainders(
      remainingGroups,
      room.capacity,
      remainingTotal,
    );

    seats.forEach((seatCount, groupIndex) => {
      const group = remainingGroups[groupIndex];

      if (!group || seatCount === 0) {
        return;
      }

      room.students.push(...group.students.splice(0, seatCount));
      remainingTotal -= seatCount;
    });
  }

  return rooms;
}
