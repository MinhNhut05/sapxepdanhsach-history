"use client";

import { useMemo, useState } from "react";

import {
  createUploadError,
  getImportStateLabel,
  type ImportResultPayload,
  type ImportState,
} from "./import-state";
import { ImportIssuesTable } from "./import-issues-table";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportSummary } from "./import-summary";

interface UploadPanelProps {
  onImportResultChange?: (result: ImportResultPayload | null) => void;
}

function statusBadgeClass(status: ImportState): string {
  switch (status) {
    case "success":
      return "status-badge--success";
    case "error":
      return "status-badge--danger";
    case "uploading":
      return "status-badge--warning";
    case "idle":
    default:
      return "status-badge--neutral";
  }
}

function intakeBadgeClass(intakeState: ImportResultPayload["intakeState"]): string {
  switch (intakeState) {
    case "ready":
      return "status-badge--success";
    case "review_required":
      return "status-badge--warning";
    case "failed":
    default:
      return "status-badge--danger";
  }
}

export function UploadPanel({ onImportResultChange }: UploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportState>("idle");
  const [result, setResult] = useState<ImportResultPayload | null>(null);

  const intakeState = result?.intakeState;
  const isReady = result?.ok && intakeState === "ready";
  const isReviewRequired = result?.ok && intakeState === "review_required";
  const isFailed = result?.ok === false || intakeState === "failed";

  const helperMessage = useMemo(() => {
    if (!result) {
      return "Chọn file rồi gửi để nhận kết quả xác thực từ server.";
    }

    if (isReviewRequired) {
      return "File có thể phục hồi nhưng cần operator xác nhận các đề xuất Smart Intake trước khi sang bước phân phòng.";
    }

    if (isReady) {
      return "File sạch đã sẵn sàng cho luồng preview và phân phòng hiện có.";
    }

    if (isFailed) {
      return "Import gặp lỗi chặn nên chưa thể tiếp tục sang bước phân phòng.";
    }

    return "Kết quả import đã được cập nhật từ server.";
  }, [isFailed, isReady, isReviewRequired, result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    setStatus("uploading");

    const formData = new FormData();
    formData.set("file", selectedFile);

    try {
      const response = await fetch("/api/rosters/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ImportResultPayload;

      setResult(payload);
      onImportResultChange?.(payload);
      setStatus(payload.ok ? "success" : "error");
    } catch {
      const uploadError = createUploadError(
        "Không thể kết nối tới API import roster lúc này.",
      );
      setResult(uploadError);
      onImportResultChange?.(uploadError);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="roster-upload">
          Tệp roster `.xlsx`, `.xls`, hoặc `.csv`
        </label>
        <input
          id="roster-upload"
          accept=".xlsx,.xls,.csv"
          className="w-full rounded-2xl border border-[var(--border-soft)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)]"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          type="file"
        />

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedFile || status === "uploading"}
          type="submit"
        >
          {status === "uploading" ? "Đang import..." : "Import roster"}
        </button>
      </form>

      <div className="rounded-2xl border border-[var(--border-soft)] bg-white/70 p-4">
        <p className="field-label">Trạng thái upload</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`status-badge ${statusBadgeClass(status)}`}>{status}</span>
          {result ? (
            <>
              <span className={`status-badge ${intakeBadgeClass(result.intakeState)}`}>
                {getImportStateLabel(result.intakeState)}
              </span>
              <span className="status-badge status-badge--info">
                {result.summary.totalRowsRead} dòng
              </span>
              <span className="status-badge status-badge--success">
                {result.summary.validStudents} hợp lệ
              </span>
              {result.requiresReview ? (
                <span className="status-badge status-badge--warning">cần review</span>
              ) : null}
              {result.sourceFormat !== "unknown" ? (
                <span className="status-badge status-badge--info">
                  {result.sourceFormat.toUpperCase()}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-sm text-[var(--text-secondary)]">{helperMessage}</span>
          )}
        </div>

        {result ? (
          <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <p>{helperMessage}</p>
            <p>
              Worksheet: {result.summary.worksheetName ?? "Chưa xác định"}. Blocking: {" "}
              {result.summary.blockingIssues} | Warning: {result.summary.warningIssues} | Info:{" "}
              {result.summary.infoIssues}
            </p>
            {isReviewRequired && result.review ? (
              <p>
                Smart Intake yêu cầu review {result.review.items.length} đề xuất, còn lại {" "}
                {result.review.items.length} mục trong payload review_required.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {isFailed && result ? <ImportIssuesTable issues={result.issues} /> : null}

      {isReady && result ? (
        <div className="space-y-5">
          <ImportSummary summary={result.summary} />
          <ImportPreviewTable students={result.students} />
          {result.issues.length > 0 ? <ImportIssuesTable issues={result.issues} /> : null}
        </div>
      ) : null}

      {isReviewRequired && result ? (
        <section className="panel-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label">Smart Intake review</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                File cần xác nhận trước khi phân phòng
              </h2>
            </div>
            <span className="status-badge status-badge--warning">review_required</span>
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
            Payload review-required sẽ được chuyển nguyên vẹn vào workspace để operator xem confidence bands, audit details, và sensitive-field proposals thay vì bị flatten thành lỗi chung.
          </p>

          {result.review ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="soft-panel">
                <p className="field-label">Tổng mục review</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {result.review.items.length}
                </p>
              </div>
              <div className="soft-panel">
                <p className="field-label">Audit records</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {result.review.audit.length}
                </p>
              </div>
              <div className="soft-panel">
                <p className="field-label">Mức confidence</p>
                <p className="mt-2 text-lg font-semibold capitalize text-[var(--text-primary)]">
                  {result.review.confidence}
                </p>
              </div>
            </div>
          ) : null}

          {result.issues.length > 0 ? (
            <div className="mt-6">
              <ImportIssuesTable issues={result.issues} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
