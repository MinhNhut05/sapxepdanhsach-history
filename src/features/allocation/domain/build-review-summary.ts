import type {
  AllocationRoomResult,
  AllocationValidationResult,
  AllocationWarning,
  ClassDistributionMetric,
  FairnessFeasibility,
  ReviewSummary,
  RoomClassBreakdown,
  RoomSizeBucket,
} from "./allocation-types";

interface BuildReviewSummaryInput {
  rooms: AllocationRoomResult[];
  fairnessFeasibility?: FairnessFeasibility | null;
  validation?: AllocationValidationResult;
}

function toPercent(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 1000) / 10;
}

function compareByCountThenName(
  left: [string, number],
  right: [string, number],
): number {
  if (right[1] !== left[1]) {
    return right[1] - left[1];
  }

  return left[0].localeCompare(right[0], "vi");
}

export function buildReviewSummary({
  rooms,
  fairnessFeasibility = null,
  validation,
}: BuildReviewSummaryInput): ReviewSummary {
  const roomSizes = rooms.map((room) => room.students.length);
  const totalStudents = roomSizes.reduce((total, size) => total + size, 0);
  const roomCount = rooms.length;
  const maxRoomSize = roomSizes.length > 0 ? Math.max(...roomSizes) : 0;
  const minRoomSize = roomSizes.length > 0 ? Math.min(...roomSizes) : 0;
  const sizeSpread = maxRoomSize - minRoomSize;

  const classTotals = new Map<string, number>();

  rooms.forEach((room) => {
    room.students.forEach((student) => {
      const className = student.canonical.className;
      classTotals.set(className, (classTotals.get(className) ?? 0) + 1);
    });
  });

  const roomSizeBuckets: RoomSizeBucket[] = Array.from(
    rooms.reduce((buckets, room) => {
      const size = room.students.length;
      const existing = buckets.get(size) ?? [];
      existing.push(room.roomNumber);
      buckets.set(size, existing);
      return buckets;
    }, new Map<number, number[]>()).entries(),
  )
    .map(([size, roomNumbers]) => ({
      size,
      roomCount: roomNumbers.length,
      roomNumbers: [...roomNumbers].sort((left, right) => left - right),
    }))
    .sort((left, right) => right.size - left.size);

  const roomClassBreakdown: RoomClassBreakdown[] = rooms.map((room) => {
    const classCounts = room.students.reduce((counts, student) => {
      const className = student.canonical.className;
      counts.set(className, (counts.get(className) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    const classes = [...classCounts.entries()]
      .sort(compareByCountThenName)
      .map(([className, count]) => ({
        className,
        count,
        percentageOfRoom: toPercent(count, room.students.length),
        percentageOfClass: toPercent(count, classTotals.get(className) ?? 0),
      }));

    return {
      roomNumber: room.roomNumber,
      studentCount: room.students.length,
      dominantClassName: classes[0]?.className ?? null,
      dominantClassPercentage: classes[0]?.percentageOfRoom ?? 0,
      classes,
    };
  });

  const classDistribution: ClassDistributionMetric[] = [...classTotals.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], "vi"))
    .map(([className, total]) => {
      const roomsForClass = rooms
        .map((room) => {
          const count = room.students.filter(
            (student) => student.canonical.className === className,
          ).length;

          return {
            roomNumber: room.roomNumber,
            count,
            percentageOfClass: toPercent(count, total),
            percentageOfRoom: toPercent(count, room.students.length),
          };
        })
        .filter((room) => room.count > 0)
        .sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }

          return left.roomNumber - right.roomNumber;
        });

      return {
        className,
        totalStudents: total,
        roomCoverage: roomsForClass.length,
        dominantRoomNumber: roomsForClass[0]?.roomNumber ?? null,
        dominantRoomSharePercent: roomsForClass[0]?.percentageOfClass ?? 0,
        rooms: roomsForClass,
      };
    });

  const warnings: AllocationWarning[] = [];

  if (sizeSpread > 1) {
    warnings.push({
      severity: "warning",
      code: "room_size_spread",
      message: "room size spread is greater than 1",
    });
  }

  if (fairnessFeasibility?.fallbackApplied) {
    warnings.push({
      severity: "warning",
      code: fairnessFeasibility.reasonCode ?? "strict_fairness_fallback",
      message:
        fairnessFeasibility.reason ??
        "Strict fairness không khả thi; hệ thống đã dùng fallback deterministic.",
    });
  }

  validation?.classSpreadViolations.forEach((violation) => {
    warnings.push({
      severity: "warning",
      code: violation.code,
      message: violation.message,
    });
  });

  return {
    totalStudents,
    roomCount,
    maxRoomSize,
    minRoomSize,
    sizeSpread,
    roomSizeBuckets,
    roomClassBreakdown,
    classDistribution,
    classSpreadByClass: validation?.classSpreadByClass ?? [],
    classSpreadViolations: validation?.classSpreadViolations ?? [],
    fairnessFeasibility,
    warnings,
  };
}
