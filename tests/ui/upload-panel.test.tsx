import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanonicalStudentRecord } from "../../src/features/roster/domain/student-record";
import type { ImportResultPayload } from "../../src/features/roster/ui/import-state";
import { UploadPanel } from "../../src/features/roster/ui/upload-panel";

function createStudent(): CanonicalStudentRecord {
  return {
    rowIndex: 2,
    raw: {
      className: "K19A",
      studentCode: "MS001",
      middleName: "Nguyễn Văn",
      firstName: "An",
      birthDate: "2024-01-13",
      birthPlace: "Huế",
      note: null,
    },
    canonical: {
      className: "K19A",
      studentCode: "MS001",
      middleName: "Nguyễn Văn",
      firstName: "An",
      fullName: "Nguyễn Văn An",
      birthDateIso: "2024-01-13",
      birthPlace: "Huế",
      note: null,
    },
    birthDateIso: "2024-01-13",
  };
}

function createSuccessfulPayload(): ImportResultPayload {
  return {
    ok: true,
    sourceFileName: "roster.xlsx",
    intakeState: "ready",
    sourceFormat: "xlsx",
    requiresReview: false,
    fallbackUsed: false,
    summary: {
      worksheetName: "Roster",
      totalRowsRead: 1,
      validStudents: 1,
      blockingIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
    },
    students: [createStudent()],
    issues: [],
  };
}

function createReviewRequiredPayload(): ImportResultPayload {
  return {
    ok: true,
    sourceFileName: "roster.csv",
    intakeState: "review_required",
    sourceFormat: "csv",
    requiresReview: true,
    fallbackUsed: false,
    summary: {
      worksheetName: "Roster",
      totalRowsRead: 1,
      validStudents: 1,
      blockingIssues: 0,
      warningIssues: 1,
      infoIssues: 1,
    },
    students: [createStudent()],
    issues: [
      {
        severity: "warning",
        code: "review_required",
        message: "Cần review trước khi phân phòng.",
      },
    ],
    review: {
      state: "review_required",
      confidence: "medium",
      summary: "Một số trường cần operator xác nhận.",
      items: [
        {
          id: "review-1",
          fieldKey: "studentCode",
          rowIndex: 2,
          label: "MSHV",
          currentValue: "MS 001",
          proposedValue: "MS001",
          confidence: "medium",
          reason: "Chuẩn hóa khoảng trắng ở MSHV.",
          source: "rule",
          sensitive: true,
          requiresReview: true,
          autoApplied: false,
        },
      ],
      audit: [
        {
          id: "audit-1",
          scope: "field",
          fieldKey: "studentCode",
          rowIndex: 2,
          rawValue: "MS 001",
          proposedValue: "MS001",
          decisionSource: "rule",
          confidence: "medium",
          reason: "Chuẩn hóa khoảng trắng ở MSHV.",
          autoApplied: false,
          sensitive: true,
        },
      ],
      unresolvedCount: 1,
      confidenceSummary: {
        high: 0,
        medium: 1,
        low: 0,
      },
      stagedStudents: [createStudent()],
      auditTrail: [
        {
          id: "audit-1",
          scope: "field",
          fieldKey: "studentCode",
          rowIndex: 2,
          rawValue: "MS 001",
          proposedValue: "MS001",
          decisionSource: "rule",
          confidence: "medium",
          reason: "Chuẩn hóa khoảng trắng ở MSHV.",
          autoApplied: false,
          sensitive: true,
        },
      ],
    },
  };
}

function createBlockingPayload(): ImportResultPayload {
  return {
    ok: false,
    sourceFileName: "roster.xlsx",
    intakeState: "failed",
    sourceFormat: "xlsx",
    requiresReview: false,
    fallbackUsed: false,
    summary: {
      worksheetName: "Roster",
      totalRowsRead: 1,
      validStudents: 0,
      blockingIssues: 1,
      warningIssues: 0,
      infoIssues: 0,
    },
    students: [],
    issues: [
      {
        severity: "blocking",
        code: "missing_required_header",
        row: 1,
        column: "NƠI SINH",
        message: "Thiếu cột bắt buộc: NƠI SINH.",
      },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UploadPanel", () => {
  it("accepts .xlsx, .xls, and .csv uploads", () => {
    render(<UploadPanel />);

    expect(screen.getByLabelText(/Tệp roster/i)).toHaveAttribute(
      "accept",
      ".xlsx,.xls,.csv",
    );
  });

  it("disables the submit button while uploading and renders parsed students on success", async () => {
    let resolveFetch:
      | ((value: { json: () => Promise<ImportResultPayload> }) => void)
      | undefined;

    const fetchMock = vi.fn(
      () =>
        new Promise<{ json: () => Promise<ImportResultPayload> }>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<UploadPanel />);

    fireEvent.change(screen.getByLabelText(/Tệp roster/i), {
      target: {
        files: [
          new File(["roster"], "roster.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /Import roster/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /Đang import/i }),
    ).toBeDisabled();

    resolveFetch?.({
      json: async () => createSuccessfulPayload(),
    });

    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    });

    expect(screen.getByText("MS001")).toBeInTheDocument();
    expect(screen.getByText("Bảng học viên hợp lệ")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("renders review_required messaging instead of the blocking-only error path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => createReviewRequiredPayload(),
      })),
    );

    render(<UploadPanel />);

    fireEvent.change(screen.getByLabelText(/Tệp roster/i), {
      target: {
        files: [new File(["roster"], "roster.csv", { type: "text/csv" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /Import roster/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/review_required/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/File cần xác nhận trước khi phân phòng/i)).toBeInTheDocument();
    expect(screen.getByText(/Payload review-required sẽ được chuyển nguyên vẹn vào workspace/i)).toBeInTheDocument();
    expect(screen.queryByText("Bảng học viên hợp lệ")).not.toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("renders blocking validation feedback when the API returns an error payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => createBlockingPayload(),
      })),
    );

    render(<UploadPanel />);

    fireEvent.change(screen.getByLabelText(/Tệp roster/i), {
      target: {
        files: [
          new File(["roster"], "roster.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /Import roster/i }));

    await waitFor(() => {
      expect(screen.getByText("Thiếu cột bắt buộc: NƠI SINH.")).toBeInTheDocument();
    });

    expect(screen.getAllByText("blocking").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bảng học viên hợp lệ")).not.toBeInTheDocument();
  });
});
