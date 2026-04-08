import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import type {
  CanonicalStudentRecord,
  SavedAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";
import { AllocationWorkspace } from "../../src/features/allocation/ui/allocation-workspace";
import type { ImportResultPayload } from "../../src/features/roster/ui/import-state";

function createStudent(index: number, className = `A${(index % 3) + 1}`): CanonicalStudentRecord {
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
      warningIssues: 1,
      infoIssues: 0,
    },
    students: [
      createStudent(0, "A1"),
      createStudent(1, "A1"),
      createStudent(2, "B1"),
      createStudent(3, "C1"),
    ],
    issues: [
      {
        severity: "warning",
        code: "import_warning",
        message: "Danh sách import có ghi chú cần review",
      },
    ],
  };
}

function createSavedRunPayload(): SavedAllocationRun {
  const students = [
    createStudent(0, "A1"),
    createStudent(1, "A1"),
    createStudent(2, "B1"),
    createStudent(3, "C1"),
  ];
  const roomCapacities = buildRoomCapacities(students.length, 2);
  const rooms = generateCandidateNumbers(
    [
      {
        roomNumber: roomCapacities[0].roomNumber,
        capacity: roomCapacities[0].capacity,
        students: [students[0], students[2], students[3]],
      },
      {
        roomNumber: roomCapacities[1].roomNumber,
        capacity: roomCapacities[1].capacity,
        students: [students[1]],
      },
    ],
    { preserveStudentOrder: true },
  );
  const summary = buildReviewSummary({ rooms });

  return {
    id: "run-review",
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Allocation review dashboard", () => {
  it("shows warning severity, fairness rows, and per-room previews before edit mode", async () => {
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
      expect(screen.getByText("Warnings & review gates")).toBeInTheDocument();
    });

    expect(screen.getByText("Độ lệch sĩ số")).toBeInTheDocument();
    expect(screen.getByText("classDistribution")).toBeInTheDocument();
    expect(
      screen.getAllByText("Danh sách import có ghi chú cần review").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("room size spread is greater than 1"),
    ).toBeInTheDocument();
    expect(screen.getByText("P01-001")).toBeInTheDocument();
    expect(screen.getAllByText(/Authoritative preview/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Lưu chỉnh sửa/i }),
    ).not.toBeInTheDocument();
  });
});
