import type {
  AllocationRoomDraft,
  CanonicalStudentRecord,
  FairnessFeasibility,
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

interface RepresentativeRatioAllocationResult {
  rooms: AllocationRoomDraft[];
  fairnessFeasibility: FairnessFeasibility;
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

function createFairnessFeasibility(
  values: Partial<FairnessFeasibility>,
): FairnessFeasibility {
  return {
    strategy: REPRESENTATIVE_RATIO_STRATEGY,
    strictClassSpreadTarget: 1,
    feasible: false,
    fallbackApplied: false,
    reasonCode: null,
    reason: null,
    ...values,
  };
}

function assignProportionalFallback(
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

function sortClassNames(classNames: Iterable<string>): string[] {
  return [...classNames].sort((left, right) => vietnameseCollator.compare(left, right));
}

function buildClassCountMaps(
  groups: RemainingClassGroup[],
): Map<string, number> {
  return new Map(groups.map((group) => [group.className, group.students.length]));
}

function distributeClassTargets(
  classTotals: Map<string, number>,
  roomCapacities: RoomCapacity[],
): number[][] | null {
  const roomCount = roomCapacities.length;
  const classNames = sortClassNames(classTotals.keys());
  const targets = roomCapacities.map(() => Array<number>(classNames.length).fill(0));
  const remainingCapacity = roomCapacities.map((room) => room.capacity);

  for (let classIndex = 0; classIndex < classNames.length; classIndex += 1) {
    const className = classNames[classIndex]!;
    const total = classTotals.get(className) ?? 0;
    const base = Math.floor(total / roomCount);
    let extras = total % roomCount;

    for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
      if (remainingCapacity[roomIndex]! < base) {
        return null;
      }

      targets[roomIndex]![classIndex] = base;
      remainingCapacity[roomIndex]! -= base;
    }

    while (extras > 0) {
      const candidates = remainingCapacity
        .map((capacity, roomIndex) => ({ capacity, roomIndex }))
        .filter((room) => room.capacity > 0)
        .sort((left, right) => {
          if (right.capacity !== left.capacity) {
            return right.capacity - left.capacity;
          }

          return left.roomIndex - right.roomIndex;
        });

      const candidateRoomIndex = candidates[0]?.roomIndex;

      if (candidateRoomIndex === undefined) {
        return null;
      }

      targets[candidateRoomIndex]![classIndex] += 1;
      remainingCapacity[candidateRoomIndex]! -= 1;
      extras -= 1;
    }
  }

  if (remainingCapacity.some((capacity) => capacity !== 0)) {
    return null;
  }

  const classSums = classNames.map((_, classIndex) =>
    targets.reduce((sum, room) => sum + (room[classIndex] ?? 0), 0),
  );

  const valid = classSums.every(
    (sum, classIndex) => sum === (classTotals.get(classNames[classIndex]!) ?? 0),
  );

  return valid ? targets : null;
}

function assignStrictRepresentativeRatio(
  students: CanonicalStudentRecord[],
  roomCapacities: RoomCapacity[],
): RepresentativeRatioAllocationResult {
  const groups = buildRemainingClassGroups(students);
  const classTotals = buildClassCountMaps(groups);
  const targets = distributeClassTargets(classTotals, roomCapacities);

  if (!targets) {
    return {
      rooms: assignProportionalFallback(students, roomCapacities),
      fairnessFeasibility: createFairnessFeasibility({
        feasible: false,
        fallbackApplied: true,
        reasonCode: "strict_fairness_infeasible",
        reason:
          "Không thể giữ độ lệch phân bổ từng lớp <= 1 với sĩ số phòng hiện tại; đã dùng fallback deterministic.",
      }),
    };
  }

  const roomAssignments = roomCapacities.map((room) => ({
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    students: [] as CanonicalStudentRecord[],
  }));

  groups.forEach((group, classIndex) => {
    targets.forEach((roomTarget, roomIndex) => {
      const seatCount = roomTarget[classIndex] ?? 0;

      if (seatCount <= 0) {
        return;
      }

      roomAssignments[roomIndex]!.students.push(...group.students.splice(0, seatCount));
    });
  });

  const allAssigned = roomAssignments.every(
    (room) => room.students.length === room.capacity,
  );
  const noRemainingStudents = groups.every((group) => group.students.length === 0);

  if (!allAssigned || !noRemainingStudents) {
    return {
      rooms: assignProportionalFallback(students, roomCapacities),
      fairnessFeasibility: createFairnessFeasibility({
        feasible: false,
        fallbackApplied: true,
        reasonCode: "strict_fairness_assignment_failed",
        reason:
          "Strict fairness target được tính nhưng không thể gán đủ sinh viên theo quota; đã dùng fallback deterministic.",
      }),
    };
  }

  return {
    rooms: roomAssignments.map((room) => ({
      ...room,
      students: sortStudentsByVietnameseName(room.students),
    })),
    fairnessFeasibility: createFairnessFeasibility({
      feasible: true,
      fallbackApplied: false,
      reasonCode: null,
      reason: null,
    }),
  };
}

export function assignRepresentativeRatio(
  students: CanonicalStudentRecord[],
  roomCapacities: RoomCapacity[],
): RepresentativeRatioAllocationResult {
  return assignStrictRepresentativeRatio(students, roomCapacities);
}
