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

    const withoutNoteResult = await importRosterWorkbook(withoutNoteBuffer, {
      fileName: "roster.xlsx",
    });
    const withNoteResult = await importRosterWorkbook(withNoteBuffer, {
      fileName: "roster.xlsx",
    });

    expect(withoutNoteResult).toMatchObject({
      ok: true,
      intakeState: "ready",
      summary: {
        validStudents: 2,
      },
    });
    expect(withoutNoteResult.students[0]?.canonical.note).toBeNull();
    expect(withNoteResult).toMatchObject({
      ok: true,
      intakeState: "ready",
      summary: {
        validStudents: 1,
      },
    });
    expect(withNoteResult.students[0]?.canonical.note).toBe("Có mặt");
    expect(withNoteResult.students[0]?.raw.note).toBe("  Có mặt  ");
  });

  it("routes noisy csv files with a title row into review instead of hard failure", async () => {
    const csvBuffer = Buffer.from(
      [
        "Danh sách học viên nhập từ CSV",
        "Lớp,MSHV,HỌ LÓT,TÊN,NGÀY SINH,NƠI SINH",
        " K19A , MS001 ,  nGUYỄN   văn , an , 13.10.1985 , huế ",
      ].join("\n"),
      "utf-8",
    );

    const result = await importRosterWorkbook(csvBuffer, {
      fileName: "roster.csv",
      mimeType: "text/csv",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(JSON.stringify(result, null, 2));
    }

    expect(result.intakeState).toBe("review_required");
    expect(result.requiresReview).toBe(true);
    expect(result.sourceFormat).toBe("csv");
    expect(result.fallbackUsed).toBe(true);
    expect(result.review?.auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawValue: " 13.10.1985 ",
          proposedValue: "1985-10-13",
        }),
      ]),
    );
  });

  it("keeps sensitive MSHV and className repairs review-required even with a preferred proposal", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      [" K19A ", " MS001 ", "Nguyễn Văn", "An", "03.10.1985", "Huế"],
    ]);

    const result = await importRosterWorkbook(buffer, {
      fileName: "roster.xlsx",
    });

    expect(result.ok).toBe(true);
    expect(result.intakeState).toBe("review_required");
    expect(result.students).toEqual([]);
    expect(result.review?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: "studentCode",
          requiresReview: true,
          autoApplied: false,
        }),
        expect.objectContaining({
          fieldKey: "className",
          requiresReview: true,
          autoApplied: false,
        }),
      ]),
    );
  });

  it("blocks duplicate MSHV values", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
      ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
      ["K19A", "MS001", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
    ]);

    const result = await importRosterWorkbook(buffer, {
      fileName: "roster.xlsx",
    });

    expect(result.ok).toBe(false);
    expect(result.intakeState).toBe("failed");
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
});
