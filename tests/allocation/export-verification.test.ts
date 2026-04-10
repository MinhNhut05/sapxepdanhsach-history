// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { buildReviewSummary } from "../../src/features/allocation/domain/build-review-summary";
import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";
import { generateCandidateNumbers } from "../../src/features/allocation/domain/generate-candidate-numbers";
import type {
  AllocationRoomResult,
  EditableAllocationRun,
} from "../../src/features/allocation/domain/allocation-types";
import { buildExportVerificationReport } from "../../src/features/allocation/server/export-verification";

function createAllocatedStudent(
  roomNumber: number,
  seatIndex: number,
  studentNumber: string,
  className = `A${(Number(studentNumber) % 2) + 1}`,
): AllocationRoomResult["students"][number] {
  return {
    rowIndex: Number(studentNumber),
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
    roomNumber,
    seatIndex,
    candidateNumber: `P${String(roomNumber).padStart(2, "0")}-${String(seatIndex).padStart(3, "0")}`,
  };
}

function createRun(options?: {
  rooms?: EditableAllocationRun["rooms"];
  isEdited?: boolean;
  sourceFileName?: string;
}) : EditableAllocationRun {
  const roomCapacities = buildRoomCapacities(3, 2);
  const baseRooms = generateCandidateNumbers(
    [
      {
        roomNumber: roomCapacities[0].roomNumber,
        capacity: roomCapacities[0].capacity,
        students: [createAllocatedStudent(1, 1, "001"), createAllocatedStudent(1, 2, "002")],
      },
      {
        roomNumber: roomCapacities[1].roomNumber,
        capacity: roomCapacities[1].capacity,
        students: [createAllocatedStudent(2, 1, "003")],
      },
    ],
    { preserveStudentOrder: true },
  );
  const rooms = options?.rooms ?? baseRooms;
  const summary = buildReviewSummary({ rooms });

  return {
    id: "run-verify",
    createdAt: "2026-04-10T10:00:00.000Z",
    sourceFileName: options?.sourceFileName ?? "K19A.xlsx",
    sourceSheetName: "Worksheet 1",
    strategy: "representative_ratio",
    roomCount: 2,
    summary,
    rooms,
    editVersion: 0,
    lastEditedAt: null,
    isEdited: options?.isEdited ?? false,
    originalSummary: summary,
    originalRooms: rooms,
  };
}

describe("buildExportVerificationReport", () => {
  it("returns deterministic pass/fail status with structured sections and no blockers for valid saved runs", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("Export verification AI config disabled.");
    }));

    const report = await buildExportVerificationReport(createRun());

    expect(report.status).toBe("pass");
    expect(report.gate.passed).toBe(true);
    expect(report.blockingFindings).toHaveLength(0);
    expect(report.sections.map((section) => section.key)).toEqual([
      "roster_integrity",
      "room_size_integrity",
      "candidate_number_integrity",
      "class_fairness_integrity",
      "template_completeness",
      "manual_edit_consistency",
    ]);
    expect(report.metadata.fallbackUsed).toBe(true);
    expect(report.metadata.fallbackReason).toBe("config");
  });

  it("fails deterministically when candidate number format is invalid even if AI returns positive advisory", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                advisories: [
                  {
                    code: "ai_positive_review",
                    severity: "info",
                    message: "AI thinks export looks good.",
                    reasoning: "No obvious issues found.",
                    confidence: 0.9,
                  },
                ],
              }),
            },
          },
        ],
      }),
    })));

    process.env.EXPORT_VERIFICATION_AI_ENABLED = "true";
    process.env.EXPORT_VERIFICATION_AI_BASE_URL = "https://example.com";
    process.env.EXPORT_VERIFICATION_AI_API_KEY = "test-key";
    process.env.EXPORT_VERIFICATION_AI_MODEL = "gpt-test";

    const brokenRooms = [
      {
        roomNumber: 1,
        capacity: 2,
        students: [
          { ...createAllocatedStudent(1, 1, "001"), candidateNumber: "INVALID" },
          createAllocatedStudent(1, 2, "002"),
        ],
      },
      {
        roomNumber: 2,
        capacity: 1,
        students: [createAllocatedStudent(2, 1, "003")],
      },
    ];

    const report = await buildExportVerificationReport(createRun({ rooms: brokenRooms }));

    expect(report.status).toBe("fail");
    expect(report.gate.passed).toBe(false);
    expect(report.blockingFindings.some((finding) => finding.code === "candidate_number_format_invalid")).toBe(true);
    expect(report.findings.some((finding) => finding.source === "ai" && finding.code === "ai_positive_review")).toBe(true);
  });

  it("falls back on quota errors and still passes when deterministic checks pass", async () => {
    process.env.EXPORT_VERIFICATION_AI_ENABLED = "true";
    process.env.EXPORT_VERIFICATION_AI_BASE_URL = "https://example.com";
    process.env.EXPORT_VERIFICATION_AI_API_KEY = "test-key";
    process.env.EXPORT_VERIFICATION_AI_MODEL = "gpt-test";

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    })));

    const report = await buildExportVerificationReport(createRun());

    expect(report.status).toBe("pass");
    expect(report.gate.passed).toBe(true);
    expect(report.metadata.fallbackUsed).toBe(true);
    expect(report.metadata.fallbackReason).toBe("quota");
    expect(report.metadata.fallbackMessage).toContain("quota");
  });
});
