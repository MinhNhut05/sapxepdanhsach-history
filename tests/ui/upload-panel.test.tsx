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

function createBlockingPayload(): ImportResultPayload {
  return {
    ok: false,
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
