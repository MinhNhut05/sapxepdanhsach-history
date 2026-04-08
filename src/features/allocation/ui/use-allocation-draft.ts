import { useState } from "react";

import type {
  AllocationWarning,
  EditableAllocationRun,
  ManualEditRoomPayload,
} from "../domain/allocation-types";
import { buildReviewSummary } from "../domain/build-review-summary";
import {
  getManualEditStudentKey,
  projectManualEdits,
} from "../domain/project-manual-edits";
import { validateManualEdits } from "../domain/validate-manual-edits";

function seedDraftRooms(run: EditableAllocationRun): ManualEditRoomPayload[] {
  return run.rooms.map((room) => ({
    roomNumber: room.roomNumber,
    studentKeys: room.students.map((student) => getManualEditStudentKey(student)),
  }));
}

function compareDraftRooms(
  left: ManualEditRoomPayload[],
  right: ManualEditRoomPayload[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clampIndex(targetIndex: number, maxIndex: number): number {
  if (targetIndex < 0) {
    return 0;
  }

  if (targetIndex > maxIndex) {
    return maxIndex;
  }

  return targetIndex;
}

interface UseAllocationDraftResult {
  rooms: ManualEditRoomPayload[];
  projectedRooms: EditableAllocationRun["rooms"];
  blockingIssues: AllocationWarning[];
  warningIssues: AllocationWarning[];
  dirty: boolean;
  moveStudent: (studentKey: string, toRoomNumber: number, toIndex?: number) => void;
  reorderStudent: (roomNumber: number, studentKey: string, toIndex: number) => void;
  resetDraft: () => void;
}

export function useAllocationDraft(
  run: EditableAllocationRun | null,
): UseAllocationDraftResult {
  const [draftState, setDraftState] = useState<{
    runKey: string | null;
    rooms: ManualEditRoomPayload[] | null;
  }>({
    runKey: null,
    rooms: null,
  });
  const currentRunKey = run ? `${run.id}:${run.editVersion}` : null;
  const authoritativeRooms = run ? seedDraftRooms(run) : [];
  const effectiveStoredRooms =
    draftState.runKey === currentRunKey ? draftState.rooms : null;
  const effectiveDraftRooms = effectiveStoredRooms ?? authoritativeRooms;
  const students = run?.originalRooms.flatMap((room) => room.students) ?? [];
  const roomCapacities =
    run?.originalRooms.map((room) => ({
      roomNumber: room.roomNumber,
      capacity: room.capacity,
    })) ?? [];
  const projection = run
    ? projectManualEdits({
        roomCapacities,
        students,
        rooms: effectiveDraftRooms,
      })
    : {
        rooms: [],
        issues: {
          duplicateRoomNumbers: [],
          unexpectedRoomNumbers: [],
          unknownStudentKeys: [],
        },
      };
  const summary = buildReviewSummary({
    rooms: projection.rooms,
  });
  const validation = validateManualEdits({
    expectedStudents: students,
    roomCapacities,
    rooms: projection.rooms,
    projectionIssues: projection.issues,
    summary,
  });

  function updateDraft(
    transform: (rooms: ManualEditRoomPayload[]) => ManualEditRoomPayload[],
  ) {
    setDraftState((current) => {
      const baseRooms =
        current.runKey === currentRunKey && current.rooms
          ? current.rooms
          : authoritativeRooms;

      return {
        runKey: currentRunKey,
        rooms: transform(baseRooms),
      };
    });
  }

  function moveStudent(studentKey: string, toRoomNumber: number, toIndex?: number) {
    updateDraft((currentRooms) => {
      const nextRooms = currentRooms.map((room) => ({
        ...room,
        studentKeys: [...room.studentKeys],
      }));
      const sourceRoom = nextRooms.find((room) =>
        room.studentKeys.includes(studentKey),
      );
      const targetRoom = nextRooms.find((room) => room.roomNumber === toRoomNumber);

      if (!sourceRoom || !targetRoom) {
        return currentRooms;
      }

      const sourceIndex = sourceRoom.studentKeys.indexOf(studentKey);

      if (sourceIndex < 0) {
        return currentRooms;
      }

      sourceRoom.studentKeys.splice(sourceIndex, 1);
      const insertAt =
        toIndex === undefined
          ? targetRoom.studentKeys.length
          : clampIndex(toIndex, targetRoom.studentKeys.length);
      targetRoom.studentKeys.splice(insertAt, 0, studentKey);

      return nextRooms;
    });
  }

  function reorderStudent(roomNumber: number, studentKey: string, toIndex: number) {
    moveStudent(studentKey, roomNumber, toIndex);
  }

  function resetDraft() {
    setDraftState({
      runKey: currentRunKey,
      rooms: null,
    });
  }

  return {
    rooms: effectiveDraftRooms,
    projectedRooms: projection.rooms,
    blockingIssues: validation.blockingIssues,
    warningIssues: validation.warningIssues,
    dirty: !compareDraftRooms(effectiveDraftRooms, authoritativeRooms),
    moveStudent,
    reorderStudent,
    resetDraft,
  };
}
