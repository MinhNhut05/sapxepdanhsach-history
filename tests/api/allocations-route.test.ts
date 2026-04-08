// @vitest-environment node

import type { Prisma } from "@prisma/client";
import { describe, expect, it, beforeEach, vi } from "vitest";

const {
  createAllocationRunMock,
  deleteManyMock,
  findManyMock,
  runAllocationMock,
} = vi.hoisted(() => ({
  createAllocationRunMock: vi.fn(),
  deleteManyMock: vi.fn(),
  findManyMock: vi.fn(),
  runAllocationMock: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    allocationRun: {
      create: createAllocationRunMock,
      deleteMany: deleteManyMock,
      findMany: findManyMock,
    },
  },
}));

vi.mock("../../src/features/allocation/server/run-allocation", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/features/allocation/server/run-allocation")>(
      "../../src/features/allocation/server/run-allocation"
    );

  return {
    ...actual,
    runAllocation: runAllocationMock,
  };
});

import { GET, POST } from "../../src/app/api/allocations/route";
import type {
  AllocationRequestPayload,
  AllocationRoomResult,
} from "../../src/features/allocation/domain/allocation-types";
import { MAX_ALLOCATION_STUDENTS } from "../../src/features/allocation/server/allocation-request";

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

function createPayload(overrides?: Partial<AllocationRequestPayload>): AllocationRequestPayload {
  return {
    sourceFileName: "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    roomCount: 13,
    strategy: "representative_ratio",
    students: Array.from({ length: 272 }, (_, index) => createStudent(index)),
    ...overrides,
  };
}

function roomSizes(rooms: AllocationRoomResult[]): number[] {
  return rooms.map((room) => room.students.length);
}

async function callAllocationsRoute(payload: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/allocations", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
      },
    }),
  );
}

async function callAllocationHistoryRoute(): Promise<Response> {
  return GET();
}

function createStoredHistoryRun(overrides?: {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastEditedAt?: Date | null;
  editedResultSnapshot?: Record<string, unknown> | null;
  sourceFileName?: string;
  strategy?: string;
  roomCount?: number;
  totalStudents?: number;
}) {
  return {
    id: overrides?.id ?? "run-history-01",
    createdAt: overrides?.createdAt ?? new Date("2026-04-08T06:00:00.000Z"),
    updatedAt: overrides?.updatedAt ?? new Date("2026-04-08T06:00:00.000Z"),
    lastEditedAt: overrides?.lastEditedAt ?? null,
    sourceFileName: overrides?.sourceFileName ?? "K19A.xlsx",
    strategy: overrides?.strategy ?? "representative_ratio",
    roomCount: overrides?.roomCount ?? 13,
    totalStudents: overrides?.totalStudents ?? 272,
    editedResultSnapshot: overrides?.editedResultSnapshot ?? null,
  };
}

beforeEach(async () => {
  createAllocationRunMock.mockReset();
  deleteManyMock.mockReset();
  findManyMock.mockReset();
  runAllocationMock.mockReset();
  deleteManyMock.mockResolvedValue({ count: 0 });
  findManyMock.mockResolvedValue([]);
  createAllocationRunMock.mockImplementation(async ({ data }: { data: Prisma.InputJsonObject }) => ({
    id: crypto.randomUUID(),
    createdAt: new Date("2026-04-08T06:00:00.000Z"),
    ...data,
  }));
  const actual =
    await vi.importActual<typeof import("../../src/features/allocation/server/run-allocation")>(
      "../../src/features/allocation/server/run-allocation"
  );
  runAllocationMock.mockImplementation(actual.runAllocation);
});

describe("GET /api/allocations", () => {
  it("returns retention metadata, newest-first active runs, and prunes expired rows", async () => {
    const now = Date.now();
    const expiredRun = createStoredHistoryRun({
      id: "run-expired",
      createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      sourceFileName: "expired.xlsx",
    });
    const activeRun = createStoredHistoryRun({
      id: "run-active",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      lastEditedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      editedResultSnapshot: {
        rooms: [],
      },
      sourceFileName: "current.xlsx",
    });

    findManyMock.mockResolvedValueOnce([expiredRun, activeRun]);

    const response = await callAllocationHistoryRoute();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.retention).toEqual({
      days: 30,
      basis: "last_activity",
    });
    expect(payload.runs).toEqual([
      expect.objectContaining({
        id: "run-active",
        sourceFileName: "current.xlsx",
        isEdited: true,
        roomCount: 13,
        totalStudents: 272,
      }),
    ]);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["run-expired"],
        },
      },
    });
  });

  it("returns 500 when the history list cannot be loaded", async () => {
    findManyMock.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await callAllocationHistoryRoute();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error.code).toBe("allocation_history_load_failed");
  });
});

describe("POST /api/allocations", () => {
  it("returns 200 for a successful saved run", async () => {
    const response = await callAllocationsRoute(createPayload());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      strategy: "representative_ratio",
      roomCount: 13,
      sourceSheetName: "Worksheet 1",
      summary: {
        totalStudents: 272,
      },
    });
    expect(payload.rooms[0].students[0].candidateNumber).toMatch(/^P\d{2}-\d{3}$/);
    expect(createAllocationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceSheetName: "Worksheet 1",
        }),
      }),
    );
  });

  it("returns 400 for malformed payloads", async () => {
    const response = await callAllocationsRoute({
      sourceFileName: "K19A.xlsx",
      roomCount: "13",
      strategy: "representative_ratio",
      students: [],
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("malformed_payload");
  });

  it("returns 413 for oversized student rosters", async () => {
    const response = await callAllocationsRoute(
      createPayload({
        students: Array.from({ length: MAX_ALLOCATION_STUDENTS + 1 }, (_, index) =>
          createStudent(index),
        ),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload.error.code).toBe("students_limit_exceeded");
  });

  it("returns 422 for impossible room-count requests", async () => {
    const response = await callAllocationsRoute(
      createPayload({
        roomCount: 5,
        students: Array.from({ length: 4 }, (_, index) => createStudent(index)),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("room_count_exceeds_students");
  });

  it("returns identical assignments for repeated requests while IDs differ", async () => {
    const firstResponse = await callAllocationsRoute(createPayload());
    const secondResponse = await callAllocationsRoute(createPayload());
    const firstPayload = await firstResponse.json();
    const secondPayload = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstPayload.id).not.toBe(secondPayload.id);
    expect(secondPayload.rooms).toEqual(firstPayload.rooms);
  });

  it("returns 503 with a structured error when persistence fails", async () => {
    createAllocationRunMock.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await callAllocationsRoute(createPayload());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("allocation_persist_failed");
  });

  it("returns 500 when allocation generation fails before persistence", async () => {
    runAllocationMock.mockImplementationOnce(() => {
      throw new Error("allocator regression");
    });

    const response = await callAllocationsRoute(createPayload());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error.code).toBe("allocation_failed");
    expect(createAllocationRunMock).not.toHaveBeenCalled();
  });

  it("returns 413 when the streamed request body exceeds the configured limit", async () => {
    const response = await POST(
      new Request("http://localhost/api/allocations", {
        method: "POST",
        body: JSON.stringify({
          sourceFileName: "K19A.xlsx",
          sourceSheetName: "Worksheet 1",
          roomCount: 13,
          strategy: "representative_ratio",
          students: [],
          padding: "x".repeat(5_100_000),
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload.error.code).toBe("payload_too_large");
  });

  it("preserves the K19A baseline 272/13 room distribution", async () => {
    const response = await callAllocationsRoute(createPayload());
    const payload = await response.json();
    const sizes = roomSizes(payload.rooms);

    expect(sizes.filter((size) => size === 21)).toHaveLength(12);
    expect(sizes.filter((size) => size === 20)).toHaveLength(1);
    expect(payload.sourceSheetName).toBe("Worksheet 1");
  });
});
