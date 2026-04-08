import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  EditableAllocationRun,
  PreparedAllocationRun,
} from "../domain/allocation-types";

export async function saveAllocationRun(
  allocationRun: PreparedAllocationRun,
): Promise<EditableAllocationRun> {
  const savedRun = await prisma.allocationRun.create({
    data: {
      sourceFileName: allocationRun.sourceFileName,
      sourceSheetName: allocationRun.sourceSheetName,
      roomCount: allocationRun.roomCount,
      strategy: allocationRun.strategy,
      totalStudents: allocationRun.totalStudents,
      algorithmVersion: allocationRun.algorithmVersion,
      rosterFingerprint: allocationRun.rosterFingerprint,
      inputSnapshot: allocationRun.inputSnapshot as unknown as Prisma.InputJsonValue,
      resultSnapshot: allocationRun.resultSnapshot as unknown as Prisma.InputJsonValue,
      summary: allocationRun.summary as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    id: savedRun.id,
    createdAt: savedRun.createdAt.toISOString(),
    sourceFileName: savedRun.sourceFileName,
    sourceSheetName: savedRun.sourceSheetName,
    strategy: allocationRun.strategy,
    roomCount: savedRun.roomCount,
    summary: allocationRun.summary,
    rooms: allocationRun.resultSnapshot.rooms,
    editVersion: savedRun.editVersion,
    lastEditedAt: savedRun.lastEditedAt?.toISOString() ?? null,
    isEdited: false,
    originalSummary: allocationRun.summary,
    originalRooms: allocationRun.resultSnapshot.rooms,
  };
}
