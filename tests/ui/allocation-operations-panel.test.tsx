import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  AllocationHistoryItem,
  AllocationRetentionPolicy,
  EditableAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";
import { AllocationHistoryPanel } from "../../src/features/allocation/ui/allocation-history-panel";
import { AllocationOutputActions } from "../../src/features/allocation/ui/allocation-output-actions";
import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";

function createHistoryItem(): AllocationHistoryItem {
  return {
    id: "run-ops",
    sourceFileName: "K19A.xlsx",
    createdAt: "2026-04-08T06:10:00.000Z",
    lastEditedAt: "2026-04-08T06:20:00.000Z",
    strategy: "representative_ratio",
    roomCount: 2,
    totalStudents: 4,
    isEdited: true,
  };
}

function createRetentionPolicy(): AllocationRetentionPolicy {
  return {
    days: 30,
    basis: "last_activity",
  };
}

function createEditableSavedRun(): EditableAllocationRun {
  const students = Array.from({ length: 4 }, (_, index) => ({
    rowIndex: index + 1,
    raw: {
      className: "K19A",
      studentCode: `MS${String(index + 1).padStart(3, "0")}`,
      middleName: "Hoc Vien",
      firstName: String(index + 1).padStart(3, "0"),
      birthDate: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    canonical: {
      className: "K19A",
      studentCode: `MS${String(index + 1).padStart(3, "0")}`,
      middleName: "Hoc Vien",
      firstName: String(index + 1).padStart(3, "0"),
      fullName: `Hoc Vien ${String(index + 1).padStart(3, "0")}`,
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    birthDateIso: "2001-01-01",
  }));
  const roomCapacities = buildRoomCapacities(students.length, 2);
  const rooms = generateCandidateNumbers(
    roomCapacities.map((roomCapacity, index) => ({
      roomNumber: roomCapacity.roomNumber,
      capacity: roomCapacity.capacity,
      students: students.slice(index * 2, index * 2 + 2),
    })),
    { preserveStudentOrder: true },
  );
  const summary = buildReviewSummary({ rooms });

  return {
    id: "run-ops",
    createdAt: "2026-04-08T06:10:00.000Z",
    sourceFileName: "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    strategy: "representative_ratio",
    roomCount: 2,
    summary,
    rooms,
    editVersion: 1,
    lastEditedAt: "2026-04-08T06:20:00.000Z",
    isEdited: true,
    originalSummary: summary,
    originalRooms: rooms,
  };
}

describe("allocation operations panels", () => {
  it("renders retention text, Mở lại actions, Xuất Excel, and room print links", () => {
    const onReopenRun = vi.fn();

    render(
      <>
        <AllocationHistoryPanel
          runs={[createHistoryItem()]}
          retention={createRetentionPolicy()}
          isLoading={false}
          error={null}
          reopeningRunId={null}
          activeRunId={null}
          onReopenRun={onReopenRun}
        />
        <AllocationOutputActions run={createEditableSavedRun()} />
      </>,
    );

    expect(screen.getByText(/retention/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mở lại/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xuất Excel/i })).toHaveAttribute(
      "href",
      "/api/allocations/run-ops/export",
    );
    expect(screen.getByRole("link", { name: /In phòng 1/i })).toHaveAttribute(
      "href",
      "/allocations/run-ops/print?room=1",
    );
    expect(screen.getByRole("link", { name: /In phòng 2/i })).toHaveAttribute(
      "href",
      "/allocations/run-ops/print?room=2",
    );
  });
});
