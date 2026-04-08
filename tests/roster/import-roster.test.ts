import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { importRosterWorkbook } from "../../src/features/roster/server/import-roster";

async function buildWorkbookBuffer(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Roster");

  rows.forEach((row) => worksheet.addRow(row));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("importRosterWorkbook", () => {
  it("imports valid workbooks with and without GHI CHÚ", async () => {
    const withoutNoteBuffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
      ["K19A", "MS002", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
    ]);
    const withNoteBuffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH", "GHI CHÚ"],
      [
        "K19B",
        "MS010",
        "Lê Minh",
        "Châu",
        "2024-03-15",
        "Quảng Trị",
        "  Có mặt  ",
      ],
    ]);

    const withoutNoteResult = await importRosterWorkbook(withoutNoteBuffer);
    const withNoteResult = await importRosterWorkbook(withNoteBuffer);

    expect(withoutNoteResult).toMatchObject({
      ok: true,
      summary: {
        validStudents: 2,
      },
    });
    expect(withoutNoteResult.students[0]?.canonical.note).toBeNull();
    expect(withNoteResult).toMatchObject({
      ok: true,
      summary: {
        validStudents: 1,
      },
    });
    expect(withNoteResult.students[0]?.canonical.note).toBe("Có mặt");
    expect(withNoteResult.students[0]?.raw.note).toBe("  Có mặt  ");
  });

  it("blocks duplicate MSHV values", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
      ["K19A", "MS001", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
    ]);

    const result = await importRosterWorkbook(buffer);

    expect(result.ok).toBe(false);
    expect(result.students).toEqual([]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "blocking",
          code: "duplicate_student_code",
          column: "MSHV",
        }),
      ]),
    );
  });

  it("emits warnings for same name plus birth date with different MSHV", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
      ["K19B", "MS002", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
    ]);

    const result = await importRosterWorkbook(buffer);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "same_name_birth_date_different_student_code",
        }),
      ]),
    );
  });

  it("warns about blank rows inside the data region", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
      ["", "", "", "", "", ""],
      ["K19A", "MS002", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
    ]);

    const result = await importRosterWorkbook(buffer);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "blank_row_skipped",
        }),
      ]),
    );
  });

  it("records info issues when canonical values differ from raw values", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["  K19A ", " MS001 ", "  nGUYỄN   văn ", " an ", "2024-01-13", " huế "],
    ]);

    const result = await importRosterWorkbook(buffer);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "info",
          row: 2,
        }),
      ]),
    );
    expect(result.students[0]).toMatchObject({
      canonical: {
        firstName: "An",
        middleName: "Nguyễn Văn",
      },
    });
  });
});
