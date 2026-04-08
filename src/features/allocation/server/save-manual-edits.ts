import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { buildReviewSummary } from "../domain/build-review-summary";
import type {
  AllocationInputSnapshot,
  AllocationResultSnapshot,
  EditableAllocationRun,
  SaveManualEditsPayload,
} from "../domain/allocation-types";
import { projectManualEdits } from "../domain/project-manual-edits";
import { validateManualEdits } from "../domain/validate-manual-edits";

import {
  AllocationRunRouteError,
  toEditableAllocationRun,
} from "./load-allocation-run";

const manualEditRoomSchema = z.object({
  roomNumber: z.number().int().positive(),
  studentKeys: z.array(z.string().min(1)),
});

const saveManualEditsSchema = z.object({
  expectedEditVersion: z.number().int().min(0),
  rooms: z.array(manualEditRoomSchema).min(1),
});

function asSavePayload(payload: unknown): SaveManualEditsPayload {
  const parsed = saveManualEditsSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AllocationRunRouteError(
      "Malformed manual edit payload",
      400,
      "malformed_payload",
      parsed.error.flatten(),
    );
  }

  return parsed.data;
}

export async function saveManualEdits(
  allocationRunId: string,
  payload: unknown,
): Promise<EditableAllocationRun> {
  const parsedPayload = asSavePayload(payload);
  const allocationRun = await prisma.allocationRun.findUnique({
    where: {
      id: allocationRunId,
    },
  });

  if (!allocationRun) {
    throw new AllocationRunRouteError(
      "Không tìm thấy saved run cần chỉnh sửa.",
      404,
      "allocation_run_not_found",
    );
  }

  if (allocationRun.editVersion !== parsedPayload.expectedEditVersion) {
    throw new AllocationRunRouteError(
      "Saved run này đã được chỉnh sửa ở nơi khác. Hãy tải lại trước khi lưu tiếp.",
      409,
      "stale_edit_version",
      {
        currentEditVersion: allocationRun.editVersion,
      },
    );
  }

  const inputSnapshot = allocationRun.inputSnapshot as unknown as AllocationInputSnapshot;
  const originalSnapshot = allocationRun.resultSnapshot as unknown as AllocationResultSnapshot;
  const projected = projectManualEdits({
    roomCapacities: originalSnapshot.roomCapacities,
    students: inputSnapshot.students,
    rooms: parsedPayload.rooms,
  });
  const summary = buildReviewSummary({
    rooms: projected.rooms,
  });
  const validation = validateManualEdits({
    expectedStudents: inputSnapshot.students,
    roomCapacities: originalSnapshot.roomCapacities,
    rooms: projected.rooms,
    projectionIssues: projected.issues,
    summary,
  });

  if (validation.blockingIssues.length > 0) {
    throw new AllocationRunRouteError(
      "Manual edits contain blocking integrity issues.",
      422,
      "manual_edit_validation_failed",
      {
        blockingIssues: validation.blockingIssues,
        warningIssues: validation.warningIssues,
      },
    );
  }

  const updatedRun = await prisma.allocationRun.update({
    where: {
      id: allocationRunId,
    },
    data: {
      editedResultSnapshot: {
        ...originalSnapshot,
        rooms: projected.rooms,
        summary,
      } as unknown as Prisma.InputJsonValue,
      editedSummary: summary as unknown as Prisma.InputJsonValue,
      editVersion: {
        increment: 1,
      },
      lastEditedAt: new Date(),
    },
  });

  return toEditableAllocationRun(updatedRun);
}
