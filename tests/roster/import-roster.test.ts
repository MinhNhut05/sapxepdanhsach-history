import ExcelJS from "exceljs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { importRosterWorkbook } from "../../src/features/roster/server/import-roster";

async function buildWorkbookBuffer(
  sheets: Array<{
    name: string;
    rows: unknown[][];
  }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, rows }) => {
    const worksheet = workbook.addWorksheet(name);
    rows.forEach((row) => worksheet.addRow(row));
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("importRosterWorkbook", () => {
  it("imports valid workbooks with and without GHI CHÚ", async () => {
    const withoutNoteBuffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
          ["K19A", "MS002", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
        ],
      },
    ]);
    const withNoteBuffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
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
        ],
      },
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
      selectedSheetName: "Roster",
      scannedSheetCount: 1,
      summary: {
        validStudents: 2,
      },
    });
    expect(withoutNoteResult.students[0]?.canonical.note).toBeNull();
    expect(withNoteResult).toMatchObject({
      ok: true,
      intakeState: "ready",
      selectedSheetName: "Roster",
      scannedSheetCount: 1,
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
    expect(result.selectedSheetName).toBe("Sheet1");
    expect(result.scannedSheetCount).toBe(1);
    expect(result.sheetSelectionDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheetName: "Sheet1",
          selectionReason: "single_sheet_source",
        }),
      ]),
    );
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
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          [" K19A ", " MS001 ", "Nguyễn Văn", "An", "03.10.1985", "Huế"],
        ],
      },
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

  it("keeps ambiguous AI suggestions visible in review with source ai", async () => {
    vi.stubEnv("SMART_INTAKE_AI_PROVIDER", "mock");
    vi.stubEnv("SMART_INTAKE_AI_BASE_URL", "https://ai.example.com");
    vi.stubEnv("SMART_INTAKE_AI_API_KEY", "secret-key");
    vi.stubEnv("SMART_INTAKE_AI_REASONING_MODEL", "reasoning-model");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestions: [
                    {
                      fieldKey: "note",
                      label: "GHI CHÚ",
                      rawValue: "ưu tiên cửa sổ",
                      proposedValue: "Ưu tiên cửa sổ",
                      confidence: "medium",
                      reasoning: "AI chuẩn hóa ghi chú để operator review.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      })),
    );

    const buffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH", "GHI CHÚ"],
          [" K19A ", " MS001 ", "Nguyễn Văn", "An", "2024-01-13", "Huế", "ưu tiên cửa sổ"],
        ],
      },
    ]);

    const result = await importRosterWorkbook(buffer, {
      fileName: "roster.xlsx",
    });

    expect(result.ok).toBe(true);
    expect(result.review?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "ai",
          proposedValue: "Ưu tiên cửa sổ",
          requiresReview: true,
        }),
      ]),
    );
  });

  it("falls back to review_required when AI quota is exhausted", async () => {
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

    const buffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          [" K19A ", " MS001 ", "Nguyễn Văn", "An", "03.10.1985", "Huế"],
        ],
      },
    ]);

    const result = await importRosterWorkbook(buffer, {
      fileName: "roster.xlsx",
    });

    expect(result.ok).toBe(true);
    expect(result.intakeState).toBe("review_required");
    expect(result.fallbackUsed).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "smart_intake_ai_fallback",
          message: expect.stringMatching(/quota/i),
        }),
      ]),
    );
  });

  it("selects the best candidate sheet and exposes diagnostics for blank-first-sheet workbooks", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Thông tin",
        rows: [["Danh sách học viên khóa 19"]],
      },
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
        ],
      },
    ]);

    const result = await importRosterWorkbook(buffer, {
      fileName: "roster.xlsx",
    });

    expect(result.ok).toBe(true);
    expect(result.selectedSheetName).toBe("Roster");
    expect(result.scannedSheetCount).toBe(2);
    expect(result.sheetSelectionDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheetName: "Thông tin",
          selectionReason: "lost_required_header_tiebreak",
        }),
        expect.objectContaining({
          sheetName: "Roster",
          requiredMatches: 6,
          dataRowCount: 1,
          selectionReason: "selected_best_candidate",
        }),
      ]),
    );
  });

  it("returns best-candidate context when no worksheet satisfies required headers", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Ghi chú",
        rows: [["Danh sách tạm"], ["Mã lớp", "Mã học viên", "Tên"]],
      },
      {
        name: "Roster gần đúng",
        rows: [
          ["Lớp", "MSHV", "TÊN"],
          ["K19A", "MS001", "An"],
        ],
      },
    ]);

    const result = await importRosterWorkbook(buffer, {
      fileName: "roster.xlsx",
    });

    expect(result.ok).toBe(false);
    expect(result.intakeState).toBe("failed");
    expect(result.selectedSheetName).toBe("Roster gần đúng");
    expect(result.sheetSelectionDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheetName: "Roster gần đúng",
          requiredMatches: 3,
          selectionReason: "selected_best_available_candidate",
        }),
      ]),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_required_header",
          column: "HỌ LÓT",
        }),
        expect.objectContaining({
          code: "missing_required_header",
          column: "NGÀY SINH",
        }),
      ]),
    );
  });

  it("blocks duplicate MSHV values", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
          ["K19A", "MS001", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
        ],
      },
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

  it("emits warnings for same name plus birth date with different MSHV", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
          ["K19B", "MS002", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
        ],
      },
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
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
          ["", "", "", "", "", ""],
          ["K19A", "MS002", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
        ],
      },
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

  it("accepts Vietnamese day-first birth dates and warns when a year is auto-repaired", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "03/10/1985", "Huế"],
          ["K19A", "MS002", "Trần Thị", "Bình", "02/01/986", "Đà Nẵng"],
        ],
      },
    ]);

    const result = await importRosterWorkbook(buffer);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.students.find((student) => student.rowIndex === 2)?.birthDateIso).toBe(
      "1985-10-03",
    );
    expect(result.students.find((student) => student.rowIndex === 3)?.birthDateIso).toBe(
      "1986-01-02",
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "normalized_birth_date_short_year",
          row: 3,
          column: "NGÀY SINH",
        }),
      ]),
    );
  });

  it("records info issues when canonical values differ from raw values", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Roster",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["  K19A ", " MS001 ", "  nGUYỄN   văn ", " an ", "2024-01-13", " huế "],
        ],
      },
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

    const normalizedStudent = result.students[0] ?? result.stagedStudents?.[0];

    expect(normalizedStudent).toMatchObject({
      canonical: {
        firstName: "An",
        middleName: "Nguyễn Văn",
      },
    });
  });
});
