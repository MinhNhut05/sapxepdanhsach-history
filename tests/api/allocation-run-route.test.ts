// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import type {
  AllocationInputSnapshot,
  AllocationResultSnapshot,
  CanonicalStudentRecord,
  ReviewSummary,
} from "../../src/features/allocation/domain/allocation-types";
import { getManualEditStudentKey } from "../../src/features/allocation/domain/project-manual-edits";

const { deleteManyMock, findUniqueMock, updateMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    allocationRun: {
      deleteMany: deleteManyMock,
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

import { GET, PATCH } from "../../src/app/api/allocations/[id]/route";

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

function createSnapshot(
  students: CanonicalStudentRecord[],
  order?: number[][],
): AllocationResultSnapshot {
  const roomCapacities = buildRoomCapacities(students.length, 2);
  const draftRooms = roomCapacities.map((roomCapacity, index) => ({
    roomNumber: roomCapacity.roomNumber,
    capacity: roomCapacity.capacity,
    students: (order?.[index] ?? []).map((studentIndex) => students[studentIndex]),
  }));
  const rooms = generateCandidateNumbers(draftRooms, {
    preserveStudentOrder: true,
  });

  return {
    strategy: "representative_ratio",
    roomCapacities,
    rooms,
    summary: buildReviewSummary({ rooms }),
  };
}

function createStoredRun(overrides?: {
  resultSnapshot?: AllocationResultSnapshot;
  summary?: ReviewSummary;
  editedResultSnapshot?: AllocationResultSnapshot | null;
  editedSummary?: ReviewSummary | null;
  editVersion?: number;
  lastEditedAt?: Date | null;
}) {
  const students = [
    createStudent(0),
    createStudent(1),
    createStudent(2),
    createStudent(3),
  ];
  const resultSnapshot =
    overrides?.resultSnapshot ?? createSnapshot(students, [[0, 1], [2, 3]]);
  const summary = overrides?.summary ?? resultSnapshot.summary;

  return {
    id: "run-01",
    createdAt: new Date("2026-04-08T06:00:00.000Z"),
    updatedAt: new Date("2026-04-08T06:00:00.000Z"),
    sourceFileName: "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    roomCount: 2,
    strategy: "representative_ratio",
    totalStudents: students.length,
    algorithmVersion: "allocation-engine/v1",
    rosterFingerprint: "fp-1",
    inputSnapshot: {
      sourceFileName: "K19A.xlsx",
      sourceSheetName: "Worksheet 1",
      roomCount: 2,
      strategy: "representative_ratio",
      students,
    } satisfies AllocationInputSnapshot,
    resultSnapshot,
    summary,
    editedResultSnapshot: overrides?.editedResultSnapshot ?? null,
    editedSummary: overrides?.editedSummary ?? null,
    editVersion: overrides?.editVersion ?? 0,
    lastEditedAt: overrides?.lastEditedAt ?? null,
  };
}

async function callGetRoute(id = "run-01"): Promise<Response> {
  return GET(new Request(`http://localhost/api/allocations/${id}`), {
    params: Promise.resolve({ id }),
  });
}

async function callPatchRoute(
  payload: unknown,
  id = "run-01",
): Promise<Response> {
  return PATCH(
    new Request(`http://localhost/api/allocations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
      },
    }),
    {
      params: Promise.resolve({ id }),
    },
  );
}

beforeEach(() => {
  deleteManyMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  deleteManyMock.mockResolvedValue({ count: 0 });
  updateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    const current = createStoredRun();

    return {
      ...current,
      editedResultSnapshot: data.editedResultSnapshot,
      editedSummary: data.editedSummary,
      editVersion: current.editVersion + 1,
      lastEditedAt: new Date("2026-04-08T06:15:00.000Z"),
    };
  });
});

describe("GET /api/allocations/[id]", () => {
  it("resolves the authoritative edited run when editedResultSnapshot exists", async () => {
    const students = [
      createStudent(0),
      createStudent(1),
      createStudent(2),
      createStudent(3),
    ];
    const editedResultSnapshot = createSnapshot(students, [[1, 0], [2, 3]]);
    findUniqueMock.mockResolvedValueOnce(
      createStoredRun({
        editedResultSnapshot,
        editedSummary: editedResultSnapshot.summary,
        editVersion: 3,
        lastEditedAt: new Date("2026-04-08T06:20:00.000Z"),
      }),
    );

    const response = await callGetRoute();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      isEdited: true,
      editVersion: 3,
      lastEditedAt: "2026-04-08T06:20:00.000Z",
    });
    expect(payload.rooms[0].students[0].canonical.studentCode).toBe("MS002");
    expect(payload.originalRooms[0].students[0].canonical.studentCode).toBe("MS001");
  });

  it("fails closed and prunes the record when the saved run is expired", async () => {
    const expiredAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

    findUniqueMock.mockResolvedValueOnce({
      ...createStoredRun(),
      createdAt: expiredAt,
      updatedAt: expiredAt,
      lastEditedAt: null,
    });

    const response = await callGetRoute();
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("allocation_run_not_found");
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["run-01"],
        },
      },
    });
  });
});

describe("PATCH /api/allocations/[id]", () => {
  it("saves edits and returns the editedResultSnapshot as the authoritative payload", async () => {
    const storedRun = createStoredRun();
    const students = (storedRun.inputSnapshot as AllocationInputSnapshot).students;
    findUniqueMock.mockResolvedValueOnce(storedRun);
    updateMock.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
      ...storedRun,
      editedResultSnapshot: data.editedResultSnapshot,
      editedSummary: data.editedSummary,
      editVersion: storedRun.editVersion + 1,
      lastEditedAt: new Date("2026-04-08T06:15:00.000Z"),
    }));

    const response = await callPatchRoute({
      expectedEditVersion: 0,
      rooms: [
        {
          roomNumber: 1,
          studentKeys: [
            getManualEditStudentKey(students[1]),
            getManualEditStudentKey(students[0]),
          ],
        },
        {
          roomNumber: 2,
          studentKeys: [
            getManualEditStudentKey(students[2]),
            getManualEditStudentKey(students[3]),
          ],
        },
      ],
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.editVersion).toBe(1);
    expect(payload.isEdited).toBe(true);
    expect(payload.rooms[0].students[0].canonical.studentCode).toBe("MS002");
    expect(payload.rooms[0].students[0].candidateNumber).toBe("P01-001");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          editedResultSnapshot: expect.objectContaining({
            rooms: expect.any(Array),
          }),
        }),
      }),
    );
  });

  it("returns 409 when expectedEditVersion is stale", async () => {
    findUniqueMock.mockResolvedValueOnce(
      createStoredRun({
        editVersion: 2,
      }),
    );

    const response = await callPatchRoute({
      expectedEditVersion: 1,
      rooms: [
        {
          roomNumber: 1,
          studentKeys: ["MS001:1", "MS002:2"],
        },
      ],
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("stale_edit_version");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed patch payloads", async () => {
    findUniqueMock.mockResolvedValueOnce(createStoredRun());

    const response = await callPatchRoute({
      expectedEditVersion: "nope",
      rooms: [],
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("malformed_payload");
    expect(updateMock).not.toHaveBeenCalled();
  });
});
