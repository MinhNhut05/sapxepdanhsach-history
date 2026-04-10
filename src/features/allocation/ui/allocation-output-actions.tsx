import { useEffect, useState } from "react";

import type { EditableAllocationRun } from "../domain/allocation-types";

interface ExportVerificationFinding {
  code: string;
  section: string;
  severity: "blocking" | "warning" | "info";
  source: "deterministic" | "ai";
  message: string;
  reasoning: string;
}

interface ExportVerificationReport {
  status: "pass" | "fail";
  gate: {
    passed: boolean;
    blockingFindings: ExportVerificationFinding[];
    policy: string;
  };
  findings: ExportVerificationFinding[];
  blockingFindings: ExportVerificationFinding[];
  metadata: {
    generatedAt: string;
    fallbackUsed: boolean;
    fallbackReason: string | null;
    fallbackMessage: string | null;
  };
}

interface AllocationOutputActionsProps {
  run: Pick<EditableAllocationRun, "id" | "isEdited" | "rooms">;
}

export function AllocationOutputActions({ run }: AllocationOutputActionsProps) {
  const [verificationReport, setVerificationReport] = useState<ExportVerificationReport | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const sortedRooms = [...run.rooms].sort(
    (left, right) => left.roomNumber - right.roomNumber,
  );

  useEffect(() => {
    let cancelled = false;

    async function verifyExport() {
      setIsVerifying(true);
      setVerificationError(null);

      try {
        const response = await fetch(`/api/allocations/${run.id}/verify-export`);
        const payload = (await response.json()) as {
          verificationReport?: ExportVerificationReport;
          error?: { message?: string };
        };

        if (!response.ok || !payload.verificationReport) {
          if (!cancelled) {
            setVerificationError(
              payload.error?.message ?? "Không thể xác minh export lúc này.",
            );
            setVerificationReport(null);
          }
          return;
        }

        if (!cancelled) {
          setVerificationReport(payload.verificationReport);
        }
      } catch {
        if (!cancelled) {
          setVerificationError("Không thể xác minh export lúc này.");
          setVerificationReport(null);
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    }

    void verifyExport();

    return () => {
      cancelled = true;
    };
  }, [run.id]);

  const exportDisabled = isVerifying || !verificationReport?.gate.passed;
  const aiAdvisories = verificationReport?.findings.filter(
    (finding) => finding.source === "ai",
  ) ?? [];

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Output actions</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Export và print từ authoritative saved result
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Các liên kết này luôn đọc từ saved run hiện tại trên server, nên Excel
            và print sẽ bám theo authoritative preview{" "}
            {run.isEdited ? "đã chỉnh sửa" : "gốc"}.
          </p>
        </div>
        <a
          href={exportDisabled ? undefined : `/api/allocations/${run.id}/export`}
          aria-disabled={exportDisabled}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(147,95,35,0.18)] ${
            exportDisabled
              ? "pointer-events-none bg-slate-400"
              : "bg-[var(--accent-strong)]"
          }`}
        >
          {isVerifying ? "Đang xác minh export..." : "Xuất Excel"}
        </a>
      </div>

      <div className="mt-6 soft-panel">
        <p className="field-label">Export verification gate</p>
        {verificationError ? (
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {verificationError}
          </p>
        ) : null}
        {verificationReport ? (
          <>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Trạng thái deterministic gate: {verificationReport.gate.passed ? "pass" : "fail"}.
            </p>
            {verificationReport.blockingFindings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                {verificationReport.blockingFindings.map((finding) => (
                  <li key={finding.code}>
                    {finding.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Không có deterministic blockers. Có thể xuất file nếu cần.
              </p>
            )}
            {verificationReport.metadata.fallbackUsed ? (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                fallbackUsed: true — {verificationReport.metadata.fallbackMessage}
              </p>
            ) : null}
            {aiAdvisories.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {aiAdvisories.map((finding) => (
                  <li key={finding.code}>
                    AI advisory: {finding.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sortedRooms.map((room) => (
          <a
            key={room.roomNumber}
            href={`/allocations/${run.id}/print?room=${room.roomNumber}`}
            className="soft-panel block text-sm font-semibold text-[var(--text-primary)] no-underline"
          >
            In phòng {room.roomNumber}
          </a>
        ))}
      </div>
    </section>
  );
}
