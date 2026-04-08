import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import { AllocationWorkspace } from "../../src/features/allocation/ui/allocation-workspace";
import type { ImportResultPayload } from "../../src/features/roster/ui/import-state";
import type {
  AllocationHistoryItem,
  AllocationHistoryResponse,
  SavedAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";

function createStudent(index: number) {
  const className = `A${(index % 7) + 1}`;
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
      totalRowsRead: 272,
      validStudents: 272,
      blockingIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
    },
    students: Array.from({ length: 272 }, (_, index) => createStudent(index)),
    issues: [],
  };
}

function createReviewRequiredPayload(): ImportResultPayload {
  return {
    ok: true,
    sourceFileName: "K19A.csv",
    intakeState: "review_required",
    sourceFormat: "csv",
    requiresReview: true,
    fallbackUsed: false,
    summary: {
      worksheetName: "Worksheet 1",
      totalRowsRead: 4,
      validStudents: 4,
      blockingIssues: 0,
      warningIssues: 1,
      infoIssues: 1,
    },
    students: Array.from({ length: 4 }, (_, index) => createStudent(index)),
    issues: [
      {
        severity: "warning",
        code: "review_required",
        message: "Cần review trước khi phân phòng.",
      },
    ],
    review: {
      state: "review_required",
      confidence: "medium",
      summary: "Smart Intake dừng ở review workspace trước khi allocation mở.",
      items: [
        {
          id: "student-code-1",
          fieldKey: "studentCode",
          rowIndex: 2,
          label: "MSHV",
          currentValue: "MS 001",
          proposedValue: "MS001",
          confidence: "medium",
          reason: "Chuẩn hóa khoảng trắng ở MSHV.",
          source: "rule",
          sensitive: true,
          requiresReview: true,
        },
      ],
      audit: [
        {
          id: "student-code-1",
          scope: "field",
          fieldKey: "studentCode",
          rowIndex: 2,
          rawValue: "MS 001",
          proposedValue: "MS001",
          decisionSource: "rule",
          confidence: "medium",
          reason: "Chuẩn hóa khoảng trắng ở MSHV.",
          autoApplied: false,
          sensitive: true,
        },
      ],
      unresolvedCount: 1,
      confidenceSummary: {
        high: 0,
        medium: 1,
        low: 0,
      },
      stagedStudents: Array.from({ length: 4 }, (_, index) => createStudent(index)),
      auditTrail: [
        {
          id: "student-code-1",
          scope: "field",
          fieldKey: "studentCode",
          rowIndex: 2,
          rawValue: "MS 001",
          proposedValue: "MS001",
          decisionSource: "rule",
          confidence: "medium",
          reason: "Chuẩn hóa khoảng trắng ở MSHV.",
          autoApplied: false,
          sensitive: true,
        },
      ],
    },
  };
}

function createSavedRunPayload(): SavedAllocationRun {
  const rooms = Array.from({ length: 13 }, (_, roomIndex) => {
    const size = roomIndex === 12 ? 20 : 21;

    return {
      roomNumber: roomIndex + 1,
      capacity: size,
      students: Array.from({ length: size }, (_, seatIndex) => {
        const globalIndex = roomIndex * 21 + seatIndex;
        const student = createStudent(globalIndex);

        return {
          ...student,
          roomNumber: roomIndex + 1,
          seatIndex: seatIndex + 1,
          candidateNumber: `P${String(roomIndex + 1).padStart(2, "0")}-${String(
            seatIndex + 1,
          ).padStart(3, "0")}`,
        };
      }),
    };
  });

  return {
    id: "run-01",
    createdAt: "2026-04-08T06:10:00.000Z",
    sourceFileName: "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    strategy: "representative_ratio",
    roomCount: 13,
    summary: {
      totalStudents: 272,
      roomCount: 13,
      maxRoomSize: 21,
      minRoomSize: 20,
      sizeSpread: 1,
    },
    rooms,
  };
}

function createEditableImportPayload(): ImportResultPayload {
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
    students: Array.from({ length: 4 }, (_, index) => createStudent(index)),
    issues: [],
  };
}

function createEditableSavedRunPayload(options?: {
  id?: string;
  order?: number[][];
  isEdited?: boolean;
  editVersion?: number;
  lastEditedAt?: string | null;
  invalidBlocking?: boolean;
}): SavedAllocationRun {
  const students = Array.from({ length: 4 }, (_, index) => createStudent(index));
  const roomCapacities = buildRoomCapacities(students.length, 2);
  const baseRooms = generateCandidateNumbers(
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
  const order = options?.invalidBlocking
    ? [[0, 1], [0, 2]]
    : options?.order ?? [[0, 1], [2, 3]];
  const rooms = generateCandidateNumbers(
    roomCapacities.map((roomCapacity, index) => ({
      roomNumber: roomCapacity.roomNumber,
      capacity: roomCapacity.capacity,
      students: order[index].map((studentIndex) => students[studentIndex]),
    })),
    { preserveStudentOrder: true },
  );
  const summary = buildReviewSummary({ rooms });
  const originalSummary = buildReviewSummary({ rooms: baseRooms });

  return {
    id: options?.id ?? "run-edit",
    createdAt: "2026-04-08T06:10:00.000Z",
    sourceFileName: "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    strategy: "representative_ratio",
    roomCount: 2,
    summary,
    rooms,
    editVersion: options?.editVersion ?? 0,
    lastEditedAt: options?.lastEditedAt ?? null,
    isEdited: options?.isEdited ?? false,
    originalSummary,
    originalRooms: baseRooms,
  };
}

function createHistoryItem(overrides?: Partial<AllocationHistoryItem>): AllocationHistoryItem {
  return {
    id: overrides?.id ?? "run-history-01",
    sourceFileName: overrides?.sourceFileName ?? "K19A.xlsx",
    createdAt: overrides?.createdAt ?? "2026-04-08T06:10:00.000Z",
    lastEditedAt: overrides?.lastEditedAt ?? null,
    strategy: overrides?.strategy ?? "representative_ratio",
    roomCount: overrides?.roomCount ?? 2,
    totalStudents: overrides?.totalStudents ?? 4,
    isEdited: overrides?.isEdited ?? false,
  };
}

function createHistoryResponse(
  runs: AllocationHistoryItem[] = [],
): AllocationHistoryResponse {
  return {
    retention: {
      days: 30,
      basis: "last_activity",
    },
    runs,
  };
}

function isHistoryListRequest(url: string, init?: RequestInit): boolean {
  return url === "/api/allocations" && (!init?.method || init.method === "GET");
}

async function importRosterAndWait(fileName = "K19A.xlsx") {
  fireEvent.change(screen.getByLabelText(/Tệp roster/i), {
    target: {
      files: [
        new File(["roster"], fileName, {
          type:
            fileName.endsWith(".csv")
              ? "text/csv"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Import roster/i }));

  await waitFor(() => {
    if (fileName.endsWith(".csv")) {
      expect(screen.getAllByText(/review_required/i).length).toBeGreaterThan(0);
    } else {
      expect(screen.getByText("Bảng học viên hợp lệ")).toBeInTheDocument();
    }
  });
}

async function runAllocationAndOpenEditMode() {
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
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AllocationWorkspace", () => {
  it("keeps the allocation form disabled before import success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (isHistoryListRequest(url, init)) {
          return {
            ok: true,
            text: async () => JSON.stringify(createHistoryResponse()),
          } satisfies Partial<Response>;
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      }),
    );

    render(<AllocationWorkspace />);

    await waitFor(() => {
      expect(
        screen.getByText("Chưa có saved run nào còn trong retention window."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Chạy phân phòng/i }),
    ).toBeDisabled();
  });

  it("runs the clean fast path from import to allocation", async () => {
    const importPayload = createImportPayload();
    const savedRun = createSavedRunPayload();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (isHistoryListRequest(url, init)) {
        return {
          ok: true,
          text: async () => JSON.stringify(createHistoryResponse()),
        } satisfies Partial<Response>;
      }

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

    await importRosterAndWait();

    const runButton = screen.getByRole("button", { name: /Chạy phân phòng/i });

    expect(runButton).toBeEnabled();

    fireEvent.click(screen.getByLabelText(/Tỷ lệ đại diện/i));
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText("P01-001")).toBeInTheDocument();
    });

    expect(screen.getByText("21 SV x 12 phòng")).toBeInTheDocument();
    expect(screen.getByText("20 SV x 1 phòng")).toBeInTheDocument();
  });

  it("keeps allocation disabled during review_required and enables it after confirmation", async () => {
    const reviewPayload = createReviewRequiredPayload();
    const savedRun = createEditableSavedRunPayload();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (isHistoryListRequest(url, init)) {
        return {
          ok: true,
          text: async () => JSON.stringify(createHistoryResponse()),
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/rosters/import")) {
        return {
          json: async () => reviewPayload,
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

    await importRosterAndWait("K19A.csv");

    const runButton = screen.getByRole("button", { name: /Chạy phân phòng/i });
    const continueButton = screen.getByRole("button", {
      name: /Tiếp tục sang phân phòng/i,
    });

    expect(runButton).toBeDisabled();
    expect(screen.getByText(/Smart Intake review workspace/i)).toBeInTheDocument();
    expect(continueButton).toBeDisabled();
    expect(screen.getByText(/Smart Intake review warnings/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(continueButton).toBeEnabled();
    });

    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Chạy phân phòng/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Chạy phân phòng/i }));

    await waitFor(() => {
      expect(screen.getByText("Chỉnh sửa thủ công trên draft riêng")).toBeInTheDocument();
    });
  });

  it("shows a persistence-specific message when the saved run API fails", async () => {
    const importPayload = createImportPayload();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (isHistoryListRequest(url, init)) {
        return {
          ok: true,
          text: async () => JSON.stringify(createHistoryResponse()),
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/rosters/import")) {
        return {
          json: async () => importPayload,
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/allocations")) {
        return {
          ok: false,
          text: async () =>
            JSON.stringify({
              error: {
                message: "Không thể lưu kết quả phân phòng lúc này.",
              },
            }),
        } satisfies Partial<Response>;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<AllocationWorkspace />);

    await importRosterAndWait();

    fireEvent.click(screen.getByRole("button", { name: /Chạy phân phòng/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Không thể lưu kết quả phân phòng lúc này."),
      ).toBeInTheDocument();
    });
  });

  it("coerces fractional room counts to integers before submission", async () => {
    const importPayload = createImportPayload();
    const savedRun = createSavedRunPayload();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (isHistoryListRequest(url, init)) {
        return {
          ok: true,
          text: async () => JSON.stringify(createHistoryResponse()),
        } satisfies Partial<Response>;
      }

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

    await importRosterAndWait();

    const roomCountInput = screen.getByRole("spinbutton", {
      name: /Số phòng thi/i,
    });

    fireEvent.change(roomCountInput, {
      target: {
        value: "1.5",
      },
    });

    expect(roomCountInput).toHaveValue(1);
  });

  it("saves manual edits, sends expectedEditVersion, and rehydrates the edited snapshot", async () => {
    const importPayload = createEditableImportPayload();
    const initialSavedRun = createEditableSavedRunPayload();
    const editedSavedRun = createEditableSavedRunPayload({
      order: [[1, 0], [2, 3]],
      isEdited: true,
      editVersion: 1,
      lastEditedAt: "2026-04-08T06:20:00.000Z",
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (isHistoryListRequest(url, init)) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify(createHistoryResponse([createHistoryItem({ id: "run-edit" })])),
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/rosters/import")) {
        return {
          json: async () => importPayload,
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/allocations/run-edit")) {
        return {
          ok: true,
          text: async () => JSON.stringify(editedSavedRun),
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/allocations")) {
        return {
          ok: true,
          text: async () => JSON.stringify(initialSavedRun),
        } satisfies Partial<Response>;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<AllocationWorkspace />);

    await importRosterAndWait();
    await runAllocationAndOpenEditMode();

    const moveButtons = screen.getAllByRole("button", {
      name: /move to next room/i,
    });
    fireEvent.click(moveButtons[0]);

    fireEvent.click(screen.getByRole("button", { name: /Lưu chỉnh sửa/i }));

    await waitFor(() => {
      expect(screen.getByText(/Phản hồi draft/i)).toBeInTheDocument();
    });
  });
});
