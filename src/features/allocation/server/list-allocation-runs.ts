import { prisma } from "@/lib/prisma";

import type {
  AllocationHistoryItem,
  AllocationHistoryResponse,
} from "../domain/allocation-types";

import {
  getAllocationRetentionPolicy,
  getAllocationRunLastActivityAt,
  pruneExpiredAllocationRuns,
} from "./history-retention";

function toAllocationHistoryItem(record: {
  id: string;
  createdAt: Date;
  sourceFileName: string;
  strategy: string;
  roomCount: number;
  totalStudents: number;
  lastEditedAt: Date | null;
  editedResultSnapshot: unknown;
}): AllocationHistoryItem {
  return {
    id: record.id,
    sourceFileName: record.sourceFileName,
    createdAt: record.createdAt.toISOString(),
    lastEditedAt: record.lastEditedAt?.toISOString() ?? null,
    strategy: record.strategy as AllocationHistoryItem["strategy"],
    roomCount: record.roomCount,
    totalStudents: record.totalStudents,
    isEdited: Boolean(record.editedResultSnapshot),
  };
}

export async function listAllocationRuns(): Promise<AllocationHistoryResponse> {
  const records = await prisma.allocationRun.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  const activeRecords = await pruneExpiredAllocationRuns(
    records,
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
  const runs = activeRecords
    .sort(
      (left, right) =>
        getAllocationRunLastActivityAt(right).getTime() -
        getAllocationRunLastActivityAt(left).getTime(),
    )
    .map((record) => toAllocationHistoryItem(record));

  return {
    retention: getAllocationRetentionPolicy(),
    runs,
  };
}
