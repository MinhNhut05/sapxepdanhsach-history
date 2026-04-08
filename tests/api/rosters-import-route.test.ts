// @vitest-environment node

import ExcelJS from "exceljs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "../../src/app/api/rosters/import/route";
import { MAX_UPLOAD_BYTES } from "../../src/features/roster/server/file-guard";

async function buildWorkbookFile(
  rows: unknown[][],
  options?: {
    name?: string;
    type?: string;
  },
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Roster");

  rows.forEach((row) => worksheet.addRow(row));

  const fileName = options?.name ?? "roster.xlsx";
  const fileType =
    options?.type ??
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new File([await workbook.xlsx.writeBuffer()], fileName, {
    type: fileType,
  });
}

async function callImportRoute(file?: File): Promise<Response> {
  const formData = new FormData();

  if (file) {
    formData.set("file", file);
  }

  return POST(
    new Request("http://localhost/api/rosters/import", {
      method: "POST",
      body: formData,
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/rosters/import", () => {
  it("returns 200 for a clean .xlsx fast path", async () => {
    const file = await buildWorkbookFile([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
    ]);

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      intakeState: "ready",
      requiresReview: false,
      sourceFormat: "xlsx",
      sourceFileName: "roster.xlsx",
      fallbackUsed: false,
      summary: {
        validStudents: 1,
      },
    });
  });

  it("returns 200 for a recoverable noisy .csv review_required path", async () => {
    const file = new File(
      [
        [
          "Danh sách học viên",
          "Lớp,MSHV,HỌ LÓT,TÊN,NGÀY SINH,NƠI SINH",
          " K19A , MS001 , nGUYỄN   văn , an , 13.10.1985 , huế ",
        ].join("\n"),
      ],
      "roster.csv",
      { type: "text/csv" },
    );

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      intakeState: "review_required",
      requiresReview: true,
      sourceFormat: "csv",
      sourceFileName: "roster.csv",
      fallbackUsed: true,
      review: expect.objectContaining({
        unresolvedCount: expect.any(Number),
      }),
    });
    expect(payload.review.auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          proposedValue: "1985-10-13",
        }),
      ]),
    );
  });

  it("keeps sensitive-field MSHV repair review-only instead of auto-applying", async () => {
    const file = await buildWorkbookFile([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", " MSHV001 ", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
    ]);

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.intakeState).toBe("review_required");
    expect(payload.review.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: "studentCode",
          autoApplied: false,
          requiresReview: true,
        }),
      ]),
    );
  });

  it("returns review_required with fallbackUsed when provider quota is exhausted", async () => {
    vi.stubEnv("SMART_INTAKE_AI_PROVIDER", "mock");
    vi.stubEnv("SMART_INTAKE_AI_BASE_URL", "https://ai.example.com");
    vi.stubEnv("SMART_INTAKE_AI_API_KEY", "secret-key");
    vi.stubEnv("SMART_INTAKE_AI_REASONING_MODEL", "reasoning-model");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
      })),
    );

    const file = await buildWorkbookFile([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", " MSHV001 ", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
    ]);

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.intakeState).toBe("review_required");
    expect(payload.fallbackUsed).toBe(true);
    expect(payload.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "smart_intake_ai_fallback",
          message: expect.stringMatching(/quota/i),
        }),
      ]),
    );
  });

  it("returns 400 when the file field is missing", async () => {
    const response = await callImportRoute();
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "blocking",
          code: "missing_file",
        }),
      ]),
    );
  });

  it("returns 415 for unsupported file types", async () => {
    const file = new File(["not-a-workbook"], "roster.txt", {
      type: "text/plain",
    });

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(415);
    expect(payload.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "blocking",
          code: "unsupported_file_type",
        }),
      ]),
    );
  });

  it("returns 413 for oversized uploads", async () => {
    const oversizedBytes = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    const file = new File([oversizedBytes], "roster.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "blocking",
          code: "file_too_large",
        }),
      ]),
    );
  });

  it("returns 422 when blocking validation issues exist and includes row-level data", async () => {
    const file = await buildWorkbookFile([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
      ["K19B", "MS001", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
    ]);

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.intakeState).toBe("failed");
    expect(payload.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "blocking",
          code: "duplicate_student_code",
          row: 3,
          column: "MSHV",
        }),
      ]),
    );
  });
});
