// @vitest-environment node

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

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

describe("POST /api/rosters/import", () => {
  it("returns 200 for a successful import", async () => {
    const file = await buildWorkbookFile([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
    ]);

    const response = await callImportRoute(file);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      summary: {
        validStudents: 1,
      },
    });
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
