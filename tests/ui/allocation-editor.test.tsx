import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import type {
  CanonicalStudentRecord,
  SavedAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";
import { AllocationWorkspace } from "../../src/features/allocation/ui/allocation-workspace";
import type { ImportResultPayload } from "../../src/features/roster/ui/import-state";

function createStudent(index: number, className = `A${(index % 2) + 1}`): CanonicalStudentRecord {
  const studentNumber = String(index + 1).padStart(3, "0");

  return {
    rowIndex: index + 1,
    raw: {
      className,
      studentCode: `MS${studentNumber}`,
      middleName: "Hoc Vien",
      firstName: studentNumber,
      birthDate: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    canonical: {
      className,
      studentCode: `MS${studentNumber}`,
      middleName: "Hoc Vien",
      firstName: studentNumber,
      fullName: `Hoc Vien ${studentNumber}`,
      birthDateIso: "2001-01-01",
      birthPlace: "Hue",
      note: null,
    },
    birthDateIso: "2001-01-01",
  };
}

function createImportPayload(): ImportResultPayload {
  return {
    ok: true,
    sourceFileName: "K19A.xlsx",
    intakeState: "ready",
    sourceFormat: "xlsx",
    requiresReview: false,
    fallbackUsed: false,
    summary: {
      worksheetName: "Worksheet 1",
      totalRowsRead: 4,
      validStudents: 4,
      blockingIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
    },
    students: [
      createStudent(0),
      createStudent(1),
      createStudent(2),
      createStudent(3),
    ],
    issues: [],
  };
}

function createSavedRunPayload(): SavedAllocationRun {
  const students = [
    createStudent(0),
    createStudent(1),
    createStudent(2),
    createStudent(3),
  ];
  const roomCapacities = buildRoomCapacities(students.length, 2);
  const rooms = generateCandidateNumbers(
    [
      {
        roomNumber: roomCapacities[0].roomNumber,
        capacity: roomCapacities[0].capacity,
        students: [students[0], students[1]],
      },
      {
        roomNumber: roomCapacities[1].roomNumber,
        capacity: roomCapacities[1].capacity,
        students: [students[2], students[3]],
      },
    ],
    { preserveStudentOrder: true },
  );
  const summary = buildReviewSummary({ rooms });

  return {
    id: "run-editor",
    createdAt: "2026-04-08T06:10:00.000Z",
    sourceFileName: "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    strategy: "representative_ratio",
    roomCount: 2,
    summary,
    rooms,
    editVersion: 0,
    lastEditedAt: null,
    isEdited: false,
    originalSummary: summary,
    originalRooms: rooms,
  };
}

async function renderEditorWorkspace() {
  const importPayload = createImportPayload();
  const savedRun = createSavedRunPayload();
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("/api/rosters/import")) {
      return {
        json: async () => importPayload,
      } satisfies Partial<Response>;
    }

    if (url.includes("/api/allocations")) {
      return {
        ok: true,
        text: async () => JSON.stringify(savedRun),
      } satisfies Partial<Response>;
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<AllocationWorkspace />);

  fireEvent.change(screen.getByLabelText(/Tệp roster/i), {
    target: {
      files: [
        new File(["roster"], "K19A.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Import roster/i }));

  await waitFor(() => {
    expect(screen.getByText("Bảng học viên hợp lệ")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /Chạy phân phòng/i }));

  await waitFor(() => {
    expect(screen.getByText(/Manual editing/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /Mở chế độ chỉnh sửa/i }));

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /Lưu chỉnh sửa/i }),
    ).toBeInTheDocument();
  });

  const editorSection = screen
    .getByText(/DndContext và explicit move controls/i)
    .closest("section");

  if (!editorSection) {
    throw new Error("Draft editor section not found");
  }

  return within(editorSection);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Allocation editor", () => {
  it("reorders a student within one room and updates provisional candidateNumber", async () => {
    const editor = await renderEditorWorkspace();

    fireEvent.click(editor.getByRole("button", { name: /move up MS002/i }));

    const studentCard = editor.getByText(/MS002/).closest("article");

    if (!studentCard) {
      throw new Error("Student card not found");
    }

    expect(within(studentCard).getByText("P01-001")).toBeInTheDocument();
  });

  it("moves a student to another room and updates room counts", async () => {
    const editor = await renderEditorWorkspace();

    fireEvent.click(editor.getByRole("button", { name: /move to next room MS001/i }));

    expect(editor.getByText("1/2 seats")).toBeInTheDocument();
    expect(editor.getByText("3/2 seats")).toBeInTheDocument();
  });

  it("surfaces size spread warning feedback without losing any student rows", async () => {
    const editor = await renderEditorWorkspace();

    fireEvent.click(editor.getByRole("button", { name: /move to next room MS001/i }));

    expect(
      screen.getByText("room size spread is greater than 1"),
    ).toBeInTheDocument();
    expect(editor.getByText(/MS001/)).toBeInTheDocument();
    expect(editor.getByText(/MS002/)).toBeInTheDocument();
    expect(editor.getByText(/MS003/)).toBeInTheDocument();
    expect(editor.getByText(/MS004/)).toBeInTheDocument();
  });
});
