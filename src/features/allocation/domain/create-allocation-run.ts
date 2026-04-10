import { sortStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

import { assignClassGrouped } from "./assign-class-grouped";
import { assignEvenMix } from "./assign-even-mix";
import { assignRepresentativeRatio } from "./assign-representative-ratio";
import type {
  AllocationResultSnapshot,
  AllocationRoomDraft,
  AllocationRunInput,
  AllocationStrategyKey,
  FairnessFeasibility,
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
): {
  draftRooms: AllocationRoomDraft[];
  fairnessFeasibility: FairnessFeasibility | null;
} {
  const roomCapacities = buildRoomCapacities(students.length, roomCount);

  switch (strategy) {
    case "even_mix":
      return {
        draftRooms: assignEvenMix(students, roomCapacities),
        fairnessFeasibility: null,
      };
    case "class_grouped":
      return {
        draftRooms: assignClassGrouped(students, roomCapacities),
        fairnessFeasibility: null,
      };
    case "representative_ratio": {
      const result = assignRepresentativeRatio(students, roomCapacities);

      return {
        draftRooms: result.rooms,
        fairnessFeasibility: result.fairnessFeasibility,
      };
    }
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
  const { draftRooms, fairnessFeasibility } = assignRooms(
    sortedStudents,
    strategy,
    roomCount,
  );
  const rooms = generateCandidateNumbers(draftRooms);

  const validation = validateAllocationResult({
    expectedStudents: sortedStudents,
    roomCapacities,
    rooms,
    fairnessFeasibility,
  });

  const summary = buildReviewSummary({
    rooms,
    fairnessFeasibility,
    validation,
  });

  return {
    strategy,
    roomCapacities,
    rooms,
    summary,
  };
}
