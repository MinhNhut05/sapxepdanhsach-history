import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

import { assignClassGrouped } from "./assign-class-grouped";
import { assignEvenMix } from "./assign-even-mix";
import { assignRepresentativeRatio } from "./assign-representative-ratio";
import type {
  AllocationResultSnapshot,
  AllocationRoomDraft,
  AllocationRunInput,
  AllocationStrategyKey,
} from "./allocation-types";
import { buildReviewSummary } from "./build-review-summary";
import { buildRoomCapacities } from "./build-room-capacities";
import { generateCandidateNumbers } from "./generate-candidate-numbers";
import { validateAllocationResult } from "./validate-allocation-result";

function assertNever(value: never): never {
  throw new Error(`Unsupported allocation strategy: ${value}`);
}

function assignRooms(
  students: AllocationRunInput["students"],
  strategy: AllocationStrategyKey,
  roomCount: number,
): AllocationRoomDraft[] {
  const roomCapacities = buildRoomCapacities(students.length, roomCount);

  switch (strategy) {
    case "even_mix":
      return assignEvenMix(students, roomCapacities);
    case "class_grouped":
      return assignClassGrouped(students, roomCapacities);
    case "representative_ratio":
      return assignRepresentativeRatio(students, roomCapacities);
    default:
      return assertNever(strategy);
  }
}

export function createAllocationRun({
  students,
  roomCount,
  strategy,
}: AllocationRunInput): AllocationResultSnapshot {
  const sortedStudents = sortStudentsByVietnameseName(students);
  const roomCapacities = buildRoomCapacities(sortedStudents.length, roomCount);
  const draftRooms = assignRooms(sortedStudents, strategy, roomCount);
  const rooms = generateCandidateNumbers(draftRooms);

  validateAllocationResult({
    expectedStudents: sortedStudents,
    roomCapacities,
    rooms,
  });

  const summary = buildReviewSummary({
    rooms,
  });

  return {
    strategy,
    roomCapacities,
    rooms,
    summary,
  };
}
