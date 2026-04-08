"use client";

import { useState } from "react";

import {
  createUploadError,
  type ImportResultPayload,
  type ImportState,
} from "./import-state";
import { ImportIssuesTable } from "./import-issues-table";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportSummary } from "./import-summary";

export function UploadPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportState>("idle");
  const [result, setResult] = useState<ImportResultPayload | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    setStatus("uploading");

    const formData = new FormData();
    formData.set("file", selectedFile);

    try {
      const response = await fetch('/api/rosters/import', {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ImportResultPayload;

      setResult(payload);
      setStatus(payload.ok ? "success" : "error");
    } catch {
      setResult(
        createUploadError("Không thể kết nối tới API import roster lúc này."),
      );
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="roster-upload">
          Tệp roster `.xlsx`
        </label>
        <input
          id="roster-upload"
          accept=".xlsx"
          className="w-full rounded-2xl border border-[var(--border-soft)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)]"
          onChange={(event) =>
            setSelectedFile(event.target.files?.item(0) ?? null)
          }
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
          <span className="status-badge status-badge--neutral">{status}</span>
          {result ? (
            <>
              <span className="status-badge status-badge--info">
                {result.summary.totalRowsRead} dòng
              </span>
              <span className="status-badge status-badge--success">
                {result.summary.validStudents} hợp lệ
              </span>
            </>
          ) : (
            <span className="text-sm text-[var(--text-secondary)]">
              Chọn file rồi gửi để nhận kết quả xác thực từ server.
            </span>
          )}
        </div>

        {result ? (
          <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <p>
              Worksheet: {result.summary.worksheetName ?? "Chưa xác định"}.
            </p>
            <p>
              Blocking: {result.summary.blockingIssues} | Warning:{" "}
              {result.summary.warningIssues} | Info: {result.summary.infoIssues}
            </p>
          </div>
        ) : null}
      </div>

      {result && !result.ok ? (
        <ImportIssuesTable issues={result.issues} />
      ) : null}

      {result && result.ok ? (
        <div className="space-y-5">
          <ImportSummary summary={result.summary} />
          <ImportPreviewTable students={result.students} />
          {result.issues.length > 0 ? (
            <ImportIssuesTable issues={result.issues} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
