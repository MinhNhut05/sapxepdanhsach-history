import type {
  EditableAllocationRun,
  ReviewSummary,
} from "../domain/allocation-types";

import { projectOutputRecords } from "./project-output-records";
import type { ExportAiAdvisory } from "./export-ai-verifier";
import { verifyWithAi } from "./export-ai-verifier";
import { handleExportAiFailure } from "./export-ai-fallback";
import { evaluateExportGate } from "./export-verification-policy";

export const deterministicChecks = {
  buildDeterministicFindings,
};

export type ExportVerificationStatus = "pass" | "fail";
export type ExportVerificationFindingSeverity = "blocking" | "warning" | "info";
export type ExportVerificationSource = "deterministic" | "ai";

export interface ExportVerificationFinding {
  code: string;
  section:
    | "roster_integrity"
    | "room_size_integrity"
    | "candidate_number_integrity"
    | "class_fairness_integrity"
    | "template_completeness"
    | "manual_edit_consistency";
  severity: ExportVerificationFindingSeverity;
  source: ExportVerificationSource;
  message: string;
  reasoning: string;
  confidence: number;
  machineReason: string;
  metadata?: Record<string, unknown>;
}

export interface ExportVerificationSection {
  key: ExportVerificationFinding["section"];
  label: string;
  status: ExportVerificationStatus;
  findings: ExportVerificationFinding[];
}

export interface ExportVerificationReport {
  status: ExportVerificationStatus;
  gate: {
    passed: boolean;
    blockingFindings: ExportVerificationFinding[];
    policy: "deterministic_export_gate_v1";
  };
  sections: ExportVerificationSection[];
  findings: ExportVerificationFinding[];
  blockingFindings: ExportVerificationFinding[];
  metadata: {
    generatedAt: string;
    fallbackUsed: boolean;
    fallbackReason: string | null;
    fallbackMessage: string | null;
    aiEnabled: boolean;
    aiAttempted: boolean;
    runId: string;
  };
}

function makeFinding(
  finding: Omit<ExportVerificationFinding, "confidence"> & {
    confidence?: number;
  },
): ExportVerificationFinding {
  return {
    confidence: finding.confidence ?? (finding.source === "ai" ? 0.5 : 1),
    ...finding,
  };
}

function addSeatOrderWarnings(
  room: EditableAllocationRun["rooms"][number],
  findings: ExportVerificationFinding[],
) {
  room.students.forEach((student, index) => {
    const expectedSeatIndex = index + 1;
    if (student.seatIndex !== expectedSeatIndex) {
      findings.push(
        makeFinding({
          code: "manual_edit_seat_index_gap",
          section: "manual_edit_consistency",
          severity: "blocking",
          source: "deterministic",
          message: `Phòng ${room.roomNumber} có thứ tự trong phòng không liên tiếp.`,
          reasoning:
            "Seat indices must remain contiguous after manual edits so exported seating order stays auditable.",
          machineReason: "seat_index_sequence_invalid",
          metadata: {
            roomNumber: room.roomNumber,
            expectedSeatIndex,
            actualSeatIndex: student.seatIndex,
            studentCode: student.canonical.studentCode,
          },
        }),
      );
    }
  });
}

function buildDeterministicFindings(run: EditableAllocationRun): ExportVerificationFinding[] {
  const findings: ExportVerificationFinding[] = [];
  const rows = projectOutputRecords(run);
  const candidateNumbers = new Set<string>();
  const studentKeys = new Set<string>();
  const summary = run.summary as ReviewSummary;

  if (!run.sourceFileName) {
    findings.push(
      makeFinding({
        code: "missing_source_file_name",
        section: "roster_integrity",
        severity: "blocking",
        source: "deterministic",
        message: "Saved run thiếu source file name nên chưa thể audit export.",
        reasoning: "Export must preserve source-file provenance for auditability.",
        machineReason: "source_file_name_missing",
      }),
    );
  }

  if (rows.length === 0) {
    findings.push(
      makeFinding({
        code: "empty_export_projection",
        section: "template_completeness",
        severity: "blocking",
        source: "deterministic",
        message: "Saved run không có dòng dữ liệu nào để export.",
        reasoning: "Workbook export requires at least one projected output row.",
        machineReason: "projected_rows_empty",
      }),
    );
  }

  run.rooms.forEach((room) => {
    if (room.students.length !== room.capacity) {
      findings.push(
        makeFinding({
          code: "room_capacity_mismatch",
          section: "room_size_integrity",
          severity: "blocking",
          source: "deterministic",
          message: `Phòng ${room.roomNumber} có ${room.students.length} học viên nhưng capacity là ${room.capacity}.`,
          reasoning: "Room occupancy must match authoritative room capacity before export.",
          machineReason: "room_capacity_mismatch",
          metadata: {
            roomNumber: room.roomNumber,
            capacity: room.capacity,
            assignedCount: room.students.length,
          },
        }),
      );
    }

    addSeatOrderWarnings(room, findings);

    room.students.forEach((student) => {
      const studentKey = `${student.canonical.studentCode}:${student.rowIndex}`;
      if (studentKeys.has(studentKey)) {
        findings.push(
          makeFinding({
            code: "duplicate_student_assignment",
            section: "roster_integrity",
            severity: "blocking",
            source: "deterministic",
            message: `Học viên ${student.canonical.studentCode} xuất hiện nhiều hơn một lần trong saved run.`,
            reasoning: "Each canonical student must map to exactly one exported seat.",
            machineReason: "duplicate_student_assignment",
            metadata: {
              studentCode: student.canonical.studentCode,
              rowIndex: student.rowIndex,
            },
          }),
        );
      }
      studentKeys.add(studentKey);

      if (!/^P\d{2}-\d{3}$/.test(student.candidateNumber)) {
        findings.push(
          makeFinding({
            code: "candidate_number_format_invalid",
            section: "candidate_number_integrity",
            severity: "blocking",
            source: "deterministic",
            message: `Số báo danh ${student.candidateNumber} không đúng format Pxx-yyy.`,
            reasoning: "Candidate numbers must keep the agreed deterministic export format.",
            machineReason: "candidate_number_format_invalid",
            metadata: {
              candidateNumber: student.candidateNumber,
              studentCode: student.canonical.studentCode,
            },
          }),
        );
      }

      if (candidateNumbers.has(student.candidateNumber)) {
        findings.push(
          makeFinding({
            code: "candidate_number_duplicate",
            section: "candidate_number_integrity",
            severity: "blocking",
            source: "deterministic",
            message: `Số báo danh ${student.candidateNumber} bị trùng.`,
            reasoning: "Exported candidate numbers must remain unique across all rooms.",
            machineReason: "candidate_number_duplicate",
            metadata: {
              candidateNumber: student.candidateNumber,
            },
          }),
        );
      }
      candidateNumbers.add(student.candidateNumber);
    });
  });

  if (summary.sizeSpread > 1) {
    findings.push(
      makeFinding({
        code: "room_size_spread_exceeded",
        section: "room_size_integrity",
        severity: "blocking",
        source: "deterministic",
        message: `Độ lệch sĩ số phòng là ${summary.sizeSpread}, vượt quá ngưỡng <= 1.`,
        reasoning: "Authoritative room size spread must stay within the deterministic balancing contract.",
        machineReason: "room_size_spread_exceeded",
        metadata: {
          sizeSpread: summary.sizeSpread,
          minRoomSize: summary.minRoomSize,
          maxRoomSize: summary.maxRoomSize,
        },
      }),
    );
  }

  summary.classSpreadViolations.forEach((violation) => {
    findings.push(
      makeFinding({
        code: violation.code,
        section: "class_fairness_integrity",
        severity: summary.fairnessFeasibility?.feasible === false ? "warning" : "blocking",
        source: "deterministic",
        message: violation.message,
        reasoning:
          summary.fairnessFeasibility?.feasible === false
            ? "Strict fairness fallback was applied deterministically, so this remains auditable context instead of an export blocker."
            : "Strict class spread must remain within deterministic feasibility bounds before export.",
        machineReason:
          summary.fairnessFeasibility?.feasible === false
            ? "strict_fairness_fallback_applied"
            : "strict_class_spread_exceeded",
        metadata: {
          className: violation.className,
          spread: violation.spread,
          feasible: summary.fairnessFeasibility?.feasible ?? null,
        },
      }),
    );
  });

  rows.forEach((row) => {
    const requiredFields = [
      ["className", row.className],
      ["studentCode", row.studentCode],
      ["middleName", row.middleName],
      ["firstName", row.firstName],
      ["birthDateIso", row.birthDateIso],
      ["birthPlace", row.birthPlace],
    ] as const;

    requiredFields.forEach(([fieldKey, value]) => {
      if (!value || !String(value).trim()) {
        findings.push(
          makeFinding({
            code: "template_required_value_missing",
            section: "template_completeness",
            severity: "blocking",
            source: "deterministic",
            message: `Thiếu dữ liệu bắt buộc ${fieldKey} cho export row ${row.studentCode}.`,
            reasoning: "Template projection must have all required cells populated from authoritative saved-run records.",
            machineReason: "template_required_value_missing",
            metadata: {
              fieldKey,
              studentCode: row.studentCode,
              roomNumber: row.roomNumber,
            },
          }),
        );
      }
    });
  });

  return findings;
}

function buildSections(findings: ExportVerificationFinding[]): ExportVerificationSection[] {
  const definitions: Array<Pick<ExportVerificationSection, "key" | "label">> = [
    { key: "roster_integrity", label: "Roster integrity" },
    { key: "room_size_integrity", label: "Room size integrity" },
    { key: "candidate_number_integrity", label: "Candidate number integrity" },
    { key: "class_fairness_integrity", label: "Class fairness integrity" },
    { key: "template_completeness", label: "Template completeness" },
    { key: "manual_edit_consistency", label: "Manual-edit consistency" },
  ];

  return definitions.map((definition) => {
    const sectionFindings = findings.filter((finding) => finding.section === definition.key);
    const hasBlockingFinding = sectionFindings.some((finding) => finding.severity === "blocking");

    return {
      ...definition,
      status: hasBlockingFinding ? "fail" : "pass",
      findings: sectionFindings,
    };
  });
}

function toAiFindings(advisories: ExportAiAdvisory[]): ExportVerificationFinding[] {
  return advisories.map((advisory) =>
    makeFinding({
      code: advisory.code,
      section: "manual_edit_consistency",
      severity: advisory.severity,
      source: "ai",
      message: advisory.message,
      reasoning: advisory.reasoning,
      confidence: advisory.confidence,
      machineReason: advisory.code,
    }),
  );
}

export async function buildExportVerificationReport(
  run: EditableAllocationRun,
): Promise<ExportVerificationReport> {
  const deterministicFindings = buildDeterministicFindings(run);
  const deterministicSummary = {
    status: deterministicFindings.some((finding) => finding.severity === "blocking")
      ? ("fail" as const)
      : ("pass" as const),
    blockers: deterministicFindings
      .filter((finding) => finding.severity === "blocking")
      .map((finding) => ({
        code: finding.code,
        message: finding.message,
        section: finding.section,
        reasoning: finding.reasoning,
      })),
    warnings: deterministicFindings
      .filter((finding) => finding.severity !== "blocking")
      .map((finding) => ({
        code: finding.code,
        message: finding.message,
        section: finding.section,
        reasoning: finding.reasoning,
      })),
  };

  let aiFindings: ExportVerificationFinding[] = [];
  let fallbackUsed = false;
  let fallbackReason: string | null = null;
  let fallbackMessage: string | null = null;
  let aiAttempted = true;
  let aiEnabled = true;

  try {
    const advisories = await verifyWithAi({
      runId: run.id,
      deterministicSummary,
    });
    aiFindings = toAiFindings(advisories);
  } catch (error) {
    const fallback = handleExportAiFailure(error);
    fallbackUsed = true;
    fallbackReason = fallback.reason;
    fallbackMessage = fallback.message;
    aiEnabled = fallback.reason !== "config";
    aiAttempted = fallback.reason !== "config";
  }

  const findings = [...deterministicFindings, ...aiFindings];
  const sections = buildSections(findings);
  const gate = evaluateExportGate(findings);

  return {
    status: gate.passed ? "pass" : "fail",
    gate,
    sections,
    findings,
    blockingFindings: gate.blockingFindings,
    metadata: {
      generatedAt: new Date().toISOString(),
      fallbackUsed,
      fallbackReason,
      fallbackMessage,
      aiEnabled,
      aiAttempted,
      runId: run.id,
    },
  };
}
