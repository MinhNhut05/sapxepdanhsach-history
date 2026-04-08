"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AllocationHistoryResponse,
  AllocationRunSummary,
  AllocationStrategyKey,
  EditableAllocationRun,
  ReviewSummary,
  SavedAllocationRun,
} from "../domain/allocation-types";
import { buildReviewSummary } from "../domain/build-review-summary";
import { AllocationForm } from "./allocation-form";
import { AllocationFairnessMatrix } from "./allocation-fairness-matrix";
import { AllocationHistoryPanel } from "./allocation-history-panel";
import { AllocationEditor } from "./allocation-editor";
import { AllocationOutputActions } from "./allocation-output-actions";
import { AllocationResultSummary } from "./allocation-result-summary";
import { AllocationRoomTable } from "./allocation-room-table";
import { AllocationSaveBar } from "./allocation-save-bar";
import {
  AllocationWarningPanel,
  type IntakeReviewWarning,
} from "./allocation-warning-panel";
import { useAllocationDraft } from "./use-allocation-draft";
import { IntakeReviewPanel } from "@/features/roster/ui/intake-review-panel";
import type { ImportResultPayload } from "@/features/roster/ui/import-state";
import { UploadPanel } from "@/features/roster/ui/upload-panel";

function isReviewSummary(
  summary: ReviewSummary | AllocationRunSummary,
): summary is ReviewSummary {
  return "roomSizeBuckets" in summary;
}

function normalizeSavedRun(run: SavedAllocationRun): EditableAllocationRun {
  const originalRooms = run.originalRooms ?? run.rooms;
  const summary = isReviewSummary(run.summary)
    ? run.summary
    : buildReviewSummary({ rooms: run.rooms });
  const originalSummary =
    run.originalSummary && isReviewSummary(run.originalSummary)
      ? run.originalSummary
      : buildReviewSummary({ rooms: originalRooms });

  return {
    ...run,
    summary,
    editVersion: run.editVersion ?? 0,
    lastEditedAt: run.lastEditedAt ?? null,
    isEdited: run.isEdited ?? false,
    originalSummary,
    originalRooms,
  };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const rawBody = await response.text();

  return rawBody ? JSON.parse(rawBody) : null;
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: { message?: string } }).error;

  return typeof error?.message === "string" ? error.message : null;
}

function buildReviewWarnings(importResult: ImportResultPayload | null): IntakeReviewWarning[] {
  if (!importResult?.review) {
    return [];
  }

  return importResult.review.items.map((item) => ({
    severity: item.confidence === "low" ? "warning" : "info",
    code: `review_${item.fieldKey}`,
    message: `${item.label}: ${item.reason}`,
    row: item.rowIndex,
    fieldKey: item.fieldKey,
  }));
}

export function AllocationWorkspace() {
  const [importResult, setImportResult] = useState<ImportResultPayload | null>(null);
  const [history, setHistory] = useState<AllocationHistoryResponse | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [savedRunSource, setSavedRunSource] = useState<"allocation" | "history" | null>(
    null,
  );
  const [savedRun, setSavedRun] = useState<EditableAllocationRun | null>(null);
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isReopeningRunId, setIsReopeningRunId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorKind, setSaveErrorKind] = useState<"stale" | "validation" | "generic" | null>(
    null,
  );
  const [roomCount, setRoomCount] = useState(1);
  const [strategy, setStrategy] = useState<AllocationStrategyKey>("even_mix");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const validStudents = importResult?.ok ? importResult.students : [];
  const maxRoomCount = Math.min(99, Math.max(validStudents.length, 1));
  const allocationDisabled = !importResult || !importResult.ok || importResult.intakeState !== "ready";
  const draft = useAllocationDraft(savedRun);
  const reviewWarnings = useMemo(() => buildReviewWarnings(importResult), [importResult]);

  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await fetch("/api/allocations");
        const payload = await readJsonResponse(response);

        if (!response.ok) {
          setHistoryError(
            getErrorMessage(payload) ?? "Không thể tải lịch sử phân phòng lúc này.",
          );
          return;
        }

        setHistory(payload as AllocationHistoryResponse);
      } catch {
        setHistoryError("Không thể tải lịch sử phân phòng lúc này.");
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void loadHistory();
  }, []);

  useEffect(() => {
    if (!importResult?.ok) {
      setSavedRun(null);
      setSavedRunSource(null);
      setAllocationError(null);
      setSaveError(null);
      setSaveErrorKind(null);
      setIsEditMode(false);
      return;
    }

    setSavedRun(null);
    setSavedRunSource(null);
    setAllocationError(null);
    setSaveError(null);
    setSaveErrorKind(null);
    setIsEditMode(false);
    setRoomCount(Math.min(13, Math.max(importResult.students.length, 1), 99));
  }, [importResult]);

  async function handleRunAllocation() {
    if (!importResult?.ok || importResult.intakeState !== "ready") {
      return;
    }

    setIsSubmitting(true);
    setAllocationError(null);

    try {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sourceFileName: importResult.sourceFileName ?? "roster.xlsx",
          sourceSheetName: importResult.summary.worksheetName,
          roomCount,
          strategy,
          students: importResult.students,
        }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setSavedRun(null);
        setAllocationError(getErrorMessage(payload) ?? "Không thể lưu kết quả phân phòng lúc này.");
        return;
      }

      setSavedRun(normalizeSavedRun(payload as SavedAllocationRun));
      setSavedRunSource("allocation");
      setSaveError(null);
      setSaveErrorKind(null);
      setIsEditMode(false);
      setHistoryError(null);
      void (async () => {
        try {
          const historyResponse = await fetch("/api/allocations");
          const historyPayload = await readJsonResponse(historyResponse);

          if (historyResponse.ok) {
            setHistory(historyPayload as AllocationHistoryResponse);
          }
        } catch {
          // Keep the existing history panel state if refresh fails.
        }
      })();
    } catch {
      setSavedRun(null);
      setAllocationError("Không thể hoàn tất phân phòng từ API.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdits() {
    if (!savedRun) {
      return;
    }

    setIsSavingEdits(true);
    setSaveError(null);
    setSaveErrorKind(null);

    try {
      const response = await fetch(`/api/allocations/${savedRun.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          expectedEditVersion: savedRun.editVersion,
          rooms: draft.rooms,
        }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        if (response.status === 409) {
          setSaveErrorKind("stale");
          setSaveError(
            getErrorMessage(payload) ??
              "Saved run đã đổi ở nơi khác. Hãy tải lại authoritative preview rồi lưu lại.",
          );
        } else if (response.status === 422) {
          setSaveErrorKind("validation");
          setSaveError(
            getErrorMessage(payload) ??
              "Draft hiện tại còn blocking issues nên chưa thể lưu.",
          );
        } else {
          setSaveErrorKind("generic");
          setSaveError(getErrorMessage(payload) ?? "Không thể lưu chỉnh sửa lúc này.");
        }
        return;
      }

      setSavedRun(normalizeSavedRun(payload as SavedAllocationRun));
      setSaveError(null);
      setSaveErrorKind(null);
      void (async () => {
        try {
          const historyResponse = await fetch("/api/allocations");
          const historyPayload = await readJsonResponse(historyResponse);

          if (historyResponse.ok) {
            setHistory(historyPayload as AllocationHistoryResponse);
          }
        } catch {
          // Keep the current history UI if refresh fails.
        }
      })();
    } catch {
      setSaveErrorKind("generic");
      setSaveError("Không thể lưu chỉnh sửa vì PATCH /api/allocations/{id} thất bại.");
    } finally {
      setIsSavingEdits(false);
    }
  }

  async function handleReopenRun(runId: string) {
    setIsReopeningRunId(runId);
    setAllocationError(null);
    setSaveError(null);
    setSaveErrorKind(null);

    try {
      const response = await fetch(`/api/allocations/${runId}`);
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setAllocationError(
          getErrorMessage(payload) ?? "Không thể mở lại saved run đã chọn.",
        );
        return;
      }

      setSavedRun(normalizeSavedRun(payload as SavedAllocationRun));
      setSavedRunSource("history");
      setIsEditMode(false);
    } catch {
      setAllocationError("Không thể mở lại saved run từ lịch sử.");
    } finally {
      setIsReopeningRunId(null);
    }
  }

  const warningIssues =
    savedRunSource === "history"
      ? (savedRun?.summary.warnings ?? [])
      : [...(importResult?.issues ?? []), ...reviewWarnings, ...(savedRun?.summary.warnings ?? [])];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="panel-card overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <span className="status-badge status-badge--success">
                Phase 1 import
              </span>
              <span className="status-badge status-badge--success">
                Sẵn sàng nhận file .xlsx .xls .csv
              </span>
              <span className="status-badge status-badge--info">
                Phase 2 allocation
              </span>
              <span
                className={`status-badge ${
                  savedRun ? "status-badge--success" : "status-badge--neutral"
                }`}
              >
                Phase 3 review/edit
              </span>
            </div>

            <div className="space-y-3">
              <p className="section-label">Không gian điều phối</p>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
                ExamRoomAllocator
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Upload roster, giữ nguyên payload chuẩn hóa từ server, review các đề xuất Smart Intake khi cần, rồi mới chạy phân phòng thi trên homepage.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <article className="soft-panel">
                <p className="section-label">Import</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Preview và issue list vẫn dùng trực tiếp kết quả từ API import.
                </p>
              </article>
              <article className="soft-panel">
                <p className="section-label">Review</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Review-required intake sẽ ở lại workspace cho tới khi operator xác nhận xong các sửa đổi nhạy cảm.
                </p>
              </article>
              <article className="soft-panel">
                <p className="section-label">Phân phòng</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Allocation controls chỉ mở khi importResult.intakeState !== "ready" không còn đúng nữa.
                </p>
              </article>
              <article className="soft-panel">
                <p className="section-label">Kết quả</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Phòng, sĩ số, và SBD đều render từ saved run trả về bởi server.
                </p>
              </article>
            </div>
          </div>

          <aside className="soft-panel flex flex-col gap-4">
            <div>
              <p className="section-label">Phiên chạy</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                Điều phối import và phân phòng
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Chấp nhận `.xlsx`, `.xls`, và `.csv` trong cùng một entry point.
              </p>
              <p>
                Form phân phòng chỉ mở khi import thành công và intakeState đã là ready.
              </p>
              <p>
                Metadata như tên file và worksheet được giữ lại để saved runs có thể truy dấu.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <UploadPanel onImportResultChange={setImportResult} />
        <div className="space-y-6">
          <AllocationForm
            disabled={allocationDisabled}
            isSubmitting={isSubmitting}
            maxRoomCount={maxRoomCount}
            roomCount={roomCount}
            strategy={strategy}
            onRoomCountChange={(value) =>
              setRoomCount(
                Math.min(maxRoomCount, Math.max(1, Math.trunc(value || 1))),
              )
            }
            onStrategyChange={setStrategy}
            onSubmit={handleRunAllocation}
          />

          {importResult?.ok && importResult.intakeState !== "ready" ? (
            <section className="panel-card">
              <p className="section-label">Allocation gate</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Chưa thể chạy phân phòng
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Smart Intake vẫn đang ở trạng thái {importResult.intakeState}, nên operator cần hoàn tất review trước khi allocation được mở.
              </p>
            </section>
          ) : null}

          {allocationError ? (
            <section className="panel-card">
              <p className="section-label">Phản hồi API phân phòng</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Không thể hoàn tất yêu cầu
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                {allocationError}
              </p>
            </section>
          ) : null}
        </div>
      </section>

      <AllocationHistoryPanel
        runs={history?.runs ?? []}
        retention={history?.retention ?? null}
        isLoading={isLoadingHistory}
        error={historyError}
        reopeningRunId={isReopeningRunId}
        activeRunId={savedRun?.id ?? null}
        onReopenRun={handleReopenRun}
      />

      {importResult?.ok && importResult.intakeState === "review_required" ? (
        <>
          <AllocationWarningPanel
            title="Smart Intake review warnings"
            description="Review-required intake warnings vẫn hiển thị qua cùng warning surface để operator thấy toàn bộ tín hiệu chất lượng trước khi tiếp tục."
            issues={warningIssues}
          />
          <IntakeReviewPanel
            importResult={importResult}
            onResolved={(resolvedResult) => setImportResult(resolvedResult)}
          />
        </>
      ) : null}

      {savedRun ? (
        <>
          <AllocationOutputActions run={savedRun} />
          <AllocationResultSummary run={savedRun} />
          <AllocationWarningPanel
            title="Warnings & review gates"
            description={
              savedRunSource === "history"
                ? "Reopened runs chỉ hiển thị authoritative warnings đang được server giữ lại, tránh trộn với import issues của một phiên khác."
                : "Giữ import issues và allocation warnings hiển thị xuyên suốt review để operator không bỏ sót tín hiệu chất lượng."
            }
            issues={warningIssues}
          />
          <AllocationFairnessMatrix summary={savedRun.summary} />

          <section className="panel-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-label">Manual editing</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Chỉnh sửa thủ công trên draft riêng
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditMode((current) => !current);
                  setSaveError(null);
                  setSaveErrorKind(null);
                }}
                className="rounded-2xl border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
              >
                {isEditMode ? "Ẩn chế độ chỉnh sửa" : "Mở chế độ chỉnh sửa"}
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="soft-panel">
                <p className="field-label">Authoritative preview</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Dashboard ở phía trên luôn phản ánh kết quả server đang giữ làm nguồn dữ liệu thật cho export/print.
                </p>
              </div>
              <div className="soft-panel">
                <p className="field-label">Draft preview</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Edit mode chỉ thay đổi draft cục bộ. Khi chưa bấm lưu, draft không được xem là authoritative.
                </p>
              </div>
            </div>
          </section>

          {isEditMode ? (
            <>
              <AllocationSaveBar
                dirty={draft.dirty}
                blockingIssueCount={draft.blockingIssues.length}
                warningIssueCount={draft.warningIssues.length}
                isSaving={isSavingEdits}
                saveError={saveError}
                saveErrorKind={saveErrorKind}
                onReset={draft.resetDraft}
                onSave={handleSaveEdits}
              />
              <AllocationWarningPanel
                title="Phản hồi draft"
                description="Blocking integrity issues ngăn save, còn warning-only states vẫn hiển thị để operator cân nhắc trước khi ghi đè authoritative preview."
                issues={[...draft.blockingIssues, ...draft.warningIssues]}
              />
              <AllocationEditor
                rooms={draft.projectedRooms}
                dirty={draft.dirty}
                blockingIssues={draft.blockingIssues}
                warningIssues={draft.warningIssues}
                onMoveStudent={draft.moveStudent}
                onReorderStudent={draft.reorderStudent}
              />
            </>
          ) : null}

          <AllocationRoomTable
            rooms={savedRun.rooms}
            summary={savedRun.summary}
            label="Authoritative preview"
          />
        </>
      ) : (
        <section className="panel-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-label">Saved run preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Kết quả phân phòng sẽ xuất hiện tại đây
              </h2>
            </div>
            <span className="status-badge status-badge--neutral">
              Chưa có kết quả
            </span>
          </div>
          <div className="empty-slot mt-6">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Khi API `/api/allocations` trả về saved run, summary, warnings, fairness matrix và bảng từng phòng sẽ render ngay.
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Bao gồm chiến lược, room-size spread, classDistribution, warning panel, và sau đó là manual-edit draft mode.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
