import type { ExportVerificationFinding } from "./export-verification";

export function evaluateExportGate(findings: ExportVerificationFinding[]) {
  const blockingFindings = findings.filter(
    (finding) => finding.source === "deterministic" && finding.severity === "blocking",
  );

  return {
    passed: blockingFindings.length === 0,
    blockingFindings,
    policy: "deterministic_export_gate_v1" as const,
  };
}
