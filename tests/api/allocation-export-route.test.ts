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

const { deleteManyMock, findUniqueMock, buildExportVerificationReportMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  buildExportVerificationReportMock: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    allocationRun: {
      deleteMany: deleteManyMock,
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("../../src/features/allocation/server/export-verification", () => ({
  buildExportVerificationReport: buildExportVerificationReportMock,
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
  buildExportVerificationReportMock.mockReset();
  deleteManyMock.mockResolvedValue({ count: 0 });
  buildExportVerificationReportMock.mockResolvedValue({
    status: "pass",
    gate: {
      passed: true,
      blockingFindings: [],
      policy: "deterministic_export_gate_v1",
    },
    findings: [],
    blockingFindings: [],
    sections: [],
    metadata: {
      generatedAt: "2026-04-10T10:00:00.000Z",
      fallbackUsed: false,
      fallbackReason: null,
      fallbackMessage: null,
      aiEnabled: false,
      aiAttempted: false,
      runId: "run-export",
    },
  });
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

  it("rejects export when deterministic verification fails even if AI advisories are positive", async () => {
    findUniqueMock.mockResolvedValueOnce(createStoredRun());
    buildExportVerificationReportMock.mockResolvedValueOnce({
      status: "fail",
      gate: {
        passed: false,
        blockingFindings: [
          {
            code: "candidate_number_format_invalid",
            source: "deterministic",
            severity: "blocking",
            message: "Số báo danh không đúng format.",
            reasoning: "Candidate numbers must remain deterministic.",
            section: "candidate_number_integrity",
          },
        ],
        policy: "deterministic_export_gate_v1",
      },
      findings: [
        {
          code: "candidate_number_format_invalid",
          source: "deterministic",
          severity: "blocking",
          message: "Số báo danh không đúng format.",
          reasoning: "Candidate numbers must remain deterministic.",
          section: "candidate_number_integrity",
        },
        {
          code: "ai_positive_review",
          source: "ai",
          severity: "info",
          message: "AI thinks export looks good.",
          reasoning: "No obvious issues found.",
          section: "manual_edit_consistency",
        },
      ],
      blockingFindings: [
        {
          code: "candidate_number_format_invalid",
          source: "deterministic",
          severity: "blocking",
          message: "Số báo danh không đúng format.",
          reasoning: "Candidate numbers must remain deterministic.",
          section: "candidate_number_integrity",
        },
      ],
      sections: [],
      metadata: {
        generatedAt: "2026-04-10T10:00:00.000Z",
        fallbackUsed: false,
        fallbackReason: null,
        fallbackMessage: null,
        aiEnabled: true,
        aiAttempted: true,
        runId: "run-export",
      },
    });

    const response = await callExportRoute();
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("allocation_export_blocked");
    expect(payload.error.details.verificationReport.gate.passed).toBe(false);
    expect(payload.error.details.verificationReport.findings.some((finding: { source: string; code: string }) => finding.source === "ai" && finding.code === "ai_positive_review")).toBe(true);
  });
});
