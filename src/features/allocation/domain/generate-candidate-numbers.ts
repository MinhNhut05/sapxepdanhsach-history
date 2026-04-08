import { compareStudentsByVietnameseName } from "@/features/roster/lib/sort-students";

import type { AllocationRoomDraft, AllocationRoomResult } from "./allocation-types";

interface GenerateCandidateNumbersOptions {
  preserveStudentOrder?: boolean;
}

export function generateCandidateNumbers(
  rooms: AllocationRoomDraft[],
  options?: GenerateCandidateNumbersOptions,
): AllocationRoomResult[] {
  return rooms.map((room) => {
    if (room.roomNumber > 99) {
      throw new Error("roomNumber exceeds the Pxx-yyy format limit");
    }

    if (room.students.length > 999) {
      throw new Error("room capacity exceeds the Pxx-yyy format limit");
    }

    const students = [...room.students]
      .sort((left, right) =>
        options?.preserveStudentOrder ? 0 : compareStudentsByVietnameseName(left, right),
      )
      .map((student, index) => ({
        ...student,
        roomNumber: room.roomNumber,
        seatIndex: index + 1,
        candidateNumber: `P${String(room.roomNumber).padStart(2, "0")}-${String(
          index + 1,
        ).padStart(3, "0")}`,
      }));

    return {
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      students,
    };
  });
}
