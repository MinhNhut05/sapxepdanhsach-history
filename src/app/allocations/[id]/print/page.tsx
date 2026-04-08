import { notFound } from "next/navigation";

import { projectOutputRecords } from "@/features/allocation/server/project-output-records";
import {
  AllocationRunRouteError,
  loadAllocationRun,
} from "@/features/allocation/server/load-allocation-run";
import { PrintRoomActions } from "@/features/allocation/ui/print-room-actions";
import { PrintRoomView } from "@/features/allocation/ui/print-room-view";

function parseRoomNumber(input: string | string[] | undefined): number | null {
  if (typeof input !== "string" || !/^\d+$/.test(input)) {
    return null;
  }

  const roomNumber = Number(input);

  if (!Number.isInteger(roomNumber) || roomNumber <= 0) {
    return null;
  }

  return roomNumber;
}

export default async function AllocationPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const roomNumber = parseRoomNumber(resolvedSearchParams.room);

  if (!roomNumber) {
    notFound();
  }

  let savedRun;

  try {
    savedRun = await loadAllocationRun(id);
  } catch (error) {
    if (error instanceof AllocationRunRouteError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const rows = projectOutputRecords(savedRun).filter(
    (row) => row.roomNumber === roomNumber,
  );

  if (rows.length === 0) {
    notFound();
  }

  const generatedAt = savedRun.lastEditedAt ?? savedRun.createdAt;

  return (
    <main className="print-room-shell mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
      <PrintRoomActions />
      <PrintRoomView
        roomNumber={roomNumber}
        rows={rows}
        sourceFileName={savedRun.sourceFileName}
        generatedAt={generatedAt}
      />
    </main>
  );
}
