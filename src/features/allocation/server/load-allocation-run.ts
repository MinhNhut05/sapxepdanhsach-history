import type { AllocationRun } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  AllocationResultSnapshot,
  EditableAllocationRun,
  ReviewSummary,
} from "../domain/allocation-types";

import { pruneExpiredAllocationRuns } from "./history-retention";

export class AllocationRunRouteError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 422,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AllocationRunRouteError";
  }
}

function notFoundError(): AllocationRunRouteError {
  return new AllocationRunRouteError(
    "Không tìm thấy saved run cần tải.",
    404,
    "allocation_run_not_found",
  );
}

function asResultSnapshot(snapshot: unknown): AllocationResultSnapshot {
  return snapshot as AllocationResultSnapshot;
}

function asReviewSummary(summary: unknown): ReviewSummary {
  return summary as ReviewSummary;
}

export function toEditableAllocationRun(record: AllocationRun): EditableAllocationRun {
  const originalSnapshot = asResultSnapshot(record.resultSnapshot);
  const originalSummary = asReviewSummary(record.summary);
  const editedSnapshot = record.editedResultSnapshot
    ? asResultSnapshot(record.editedResultSnapshot)
    : null;
  const editedSummary = record.editedSummary
    ? asReviewSummary(record.editedSummary)
    : null;

  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    sourceFileName: record.sourceFileName,
    sourceSheetName: record.sourceSheetName,
    strategy: originalSnapshot.strategy,
    roomCount: record.roomCount,
    summary: editedSummary ?? originalSummary,
    rooms: editedSnapshot?.rooms ?? originalSnapshot.rooms,
    editVersion: record.editVersion,
    lastEditedAt: record.lastEditedAt?.toISOString() ?? null,
    isEdited: Boolean(editedSnapshot),
    originalSummary,
    originalRooms: originalSnapshot.rooms,
  };
}

export async function loadAllocationRun(id: string): Promise<EditableAllocationRun> {
  const record = await prisma.allocationRun.findUnique({
    where: {
      id,
    },
  });

  if (!record) {
    throw notFoundError();
  }

  const activeRecords = await pruneExpiredAllocationRuns(
    [record],
    async (ids) => {
      await prisma.allocationRun.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
    },
  );

  if (activeRecords.length === 0) {
    throw notFoundError();
  }

  return toEditableAllocationRun(activeRecords[0]);
}
