// @vitest-environment node

import { Workbook } from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import type {
  AllocationInputSnapshot,
  AllocationResultSnapshot,
  CanonicalStudentRecord,
} from "../../src/features/allocation/domain/allocation-types";

const { deleteManyMock, findUniqueMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    allocationRun: {
      deleteMany: deleteManyMock,
      findUnique: findUniqueMock,
    },
  },
}));

import { GET } from "../../src/app/api/allocations/[id]/export/route";

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
  order: number[][],
): AllocationResultSnapshot {
  const roomCapacities = buildRoomCapacities(students.length, 2);

  return {
    strategy: "representative_ratio",
    roomCapacities,
    rooms: generateCandidateNumbers(
      roomCapacities.map((roomCapacity, index) => ({
        roomNumber: roomCapacity.roomNumber,
        capacity: roomCapacity.capacity,
        students: order[index].map((studentIndex) => students[studentIndex]),
      })),
      { preserveStudentOrder: true },
    ),
    summary: buildReviewSummary({
      rooms: generateCandidateNumbers(
        roomCapacities.map((roomCapacity, index) => ({
          roomNumber: roomCapacity.roomNumber,
          capacity: roomCapacity.capacity,
          students: order[index].map((studentIndex) => students[studentIndex]),
        })),
        { preserveStudentOrder: true },
      ),
    }),
  };
}

function createStoredRun(overrides?: {
  resultSnapshot?: AllocationResultSnapshot;
  editedResultSnapshot?: AllocationResultSnapshot | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastEditedAt?: Date | null;
}) {
  const students = [
    createStudent(0),
    createStudent(1),
    createStudent(2),
  ];
  const resultSnapshot = overrides?.resultSnapshot ?? createSnapshot(students, [[0, 1], [2]]);
  const editedResultSnapshot =
    overrides?.editedResultSnapshot ?? createSnapshot(students, [[1, 0], [2]]);

  return {
    id: "run-export",
    createdAt: overrides?.createdAt ?? new Date("2026-04-08T06:00:00.000Z"),
    updatedAt: overrides?.updatedAt ?? new Date("2026-04-08T06:00:00.000Z"),
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
    summary: resultSnapshot.summary,
    editedResultSnapshot,
    editedSummary: editedResultSnapshot?.summary ?? null,
    editVersion: editedResultSnapshot ? 1 : 0,
    lastEditedAt:
      overrides && "lastEditedAt" in overrides
        ? overrides.lastEditedAt ?? null
        : new Date("2026-04-08T06:10:00.000Z"),
  };
}

async function callExportRoute(id = "run-export"): Promise<Response> {
  return GET(new Request(`http://localhost/api/allocations/${id}/export`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  deleteManyMock.mockReset();
  findUniqueMock.mockReset();
  deleteManyMock.mockResolvedValue({ count: 0 });
});

describe("GET /api/allocations/[id]/export", () => {
  it("returns workbook bytes with binary headers and edited Phòng 01 parity", async () => {
    findUniqueMock.mockResolvedValueOnce(createStoredRun());

    const response = await callExportRoute();
    const workbook = new Workbook();

    await workbook.xlsx.load(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toContain(
      'attachment; filename="phan-phong-run-export.xlsx"',
    );
    expect(workbook.getWorksheet("Tổng hợp")).toBeDefined();
    expect(workbook.getWorksheet("Phòng 01")).toBeDefined();
    expect(workbook.getWorksheet("Phòng 01")!.getRow(2).getCell(2).value).toBe("P01-001");
    expect(workbook.getWorksheet("Phòng 01")!.getRow(2).getCell(5).value).toBe("MS002");
    expect(workbook.getWorksheet("Phòng 01")!.getRow(3).getCell(5).value).toBe("MS001");
  });

  it("returns allocation_run_not_found when the requested run does not exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const response = await callExportRoute("missing-run");
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("allocation_run_not_found");
  });

  it("returns allocation_run_not_found for expired runs and prunes them before export", async () => {
    const expiredAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

    findUniqueMock.mockResolvedValueOnce(
      createStoredRun({
        createdAt: expiredAt,
        updatedAt: expiredAt,
        lastEditedAt: null,
      }),
    );

    const response = await callExportRoute("expired-run");
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("allocation_run_not_found");
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["run-export"],
        },
      },
    });
  });
});
