import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { detectCsvFormat } from "../../src/features/roster/server/detect-csv-format";
import { readIntakeFile } from "../../src/features/roster/server/read-intake-file";

async function buildXlsxBuffer(
  sheets: Array<{
    name: string;
    rows: unknown[][];
  }>,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, rows }) => {
    const worksheet = workbook.addWorksheet(name);
    rows.forEach((row) => worksheet.addRow(row));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

function buildXlsBuffer(
  sheets: Array<{
    name: string;
    rows: unknown[][];
  }>,
): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, rows }) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });

  const binary = XLSX.write(workbook, { bookType: "xls", type: "buffer" });

  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

function buildCsvBuffer(content: string): ArrayBuffer {
  const buffer = Buffer.from(content, "utf8");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe("readIntakeFile", () => {
  it("extracts rows from .xlsx files", async () => {
    const snapshot = await readIntakeFile(
      await buildXlsxBuffer([
        {
          name: "Roster",
          rows: [
            ["Lớp", "MSHV", "TÊN"],
            ["K19A", "MS001", "An"],
          ],
        },
      ]),
      {
        fileName: "roster.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    expect(snapshot.sourceFormat).toBe("xlsx");
    expect(snapshot.rowCount).toBe(2);
    expect(snapshot.rows[1]).toEqual(["K19A", "MS001", "An"]);
  });

  it("extracts rows from .xls files", async () => {
    const snapshot = await readIntakeFile(
      buildXlsBuffer([
        {
          name: "Roster",
          rows: [
            ["Lớp", "MSHV", "TÊN"],
            ["K19B", "MS002", "Bình"],
          ],
        },
      ]),
      {
        fileName: "roster.xls",
        mimeType: "application/vnd.ms-excel",
      },
    );

    expect(snapshot.sourceFormat).toBe("xls");
    expect(snapshot.rowCount).toBe(2);
    expect(snapshot.rows[1]).toEqual(["K19B", "MS002", "Bình"]);
  });

  it("extracts rows from comma-separated csv files", async () => {
    const snapshot = await readIntakeFile(
      buildCsvBuffer("Lớp,MSHV,TÊN\nK19C,MS003,Châu\n"),
      {
        fileName: "roster.csv",
        mimeType: "text/csv",
      },
    );

    expect(snapshot.sourceFormat).toBe("csv");
    expect(snapshot.rowCount).toBe(2);
    expect(snapshot.rows[1]).toEqual(["K19C", "MS003", "Châu"]);
  });

  it("detects semicolon csv files deterministically", () => {
    const detected = detectCsvFormat(
      buildCsvBuffer("Lớp;MSHV;TÊN\nK19D;MS004;Dung\n"),
    );

    expect(detected.delimiter).toBe(";");
    expect(detected.encoding).toBe("utf-8");
  });

  it("detects comma csv files deterministically", () => {
    const detected = detectCsvFormat(
      buildCsvBuffer("Lớp,MSHV,TÊN\nK19E,MS005,Hà\n"),
    );

    expect(detected.delimiter).toBe(",");
    expect(detected.encoding).toBe("utf-8");
  });

  it("selects the second worksheet when the first sheet is empty first sheet noise", async () => {
    const snapshot = await readIntakeFile(
      await buildXlsxBuffer([
        {
          name: "Giới thiệu",
          rows: [["Danh sách học viên khóa 19"]],
        },
        {
          name: "Roster",
          rows: [
            ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
            ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
          ],
        },
      ]),
      {
        fileName: "roster.xlsx",
      },
    );

    expect(snapshot.sheetName).toBe("Roster");
    expect(snapshot.selectedSheet.sheetName).toBe("Roster");
    expect(snapshot.selectedSheet.selectionReason).toBe("selected_best_candidate");
    expect(snapshot.scannedSheetCount).toBe(2);
    expect(snapshot.sheetSelectionDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheetName: "Giới thiệu",
          selectionReason: "lost_required_header_tiebreak",
        }),
        expect.objectContaining({
          sheetName: "Roster",
          requiredMatches: 6,
          dataRowCount: 1,
        }),
      ]),
    );
  });

  it("resolves equally valid sheets by lower header row index then lower worksheet index", async () => {
    const snapshot = await readIntakeFile(
      await buildXlsxBuffer([
        {
          name: "Sheet A",
          rows: [
            ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
            ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
          ],
        },
        {
          name: "Sheet B",
          rows: [
            ["Tiêu đề phụ"],
            ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
            ["K19B", "MS002", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
          ],
        },
      ]),
      {
        fileName: "roster.xlsx",
      },
    );

    expect(snapshot.sheetName).toBe("Sheet A");
    expect(snapshot.sheetSelectionDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheetName: "Sheet A",
          selectionReason: "selected_best_candidate",
          headerRowIndex: 0,
        }),
        expect.objectContaining({
          sheetName: "Sheet B",
          selectionReason: "lost_header_row_index_tiebreak",
          headerRowIndex: 1,
        }),
      ]),
    );
  });

  it("breaks perfect ties by lower worksheet index for stable repeated runs", async () => {
    const workbook = await buildXlsxBuffer([
      {
        name: "Sheet A",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19A", "MS001", "Nguyễn Văn", "An", "2024-01-13", "Huế"],
        ],
      },
      {
        name: "Sheet B",
        rows: [
          ["Lớp", "MSHV", "HỌ LÓT", "TÊN", "NGÀY SINH", "NƠI SINH"],
          ["K19B", "MS002", "Trần Thị", "Bình", "2024-02-14", "Đà Nẵng"],
        ],
      },
    ]);

    const firstRun = await readIntakeFile(workbook, {
      fileName: "roster.xlsx",
    });
    const secondRun = await readIntakeFile(workbook, {
      fileName: "roster.xlsx",
    });

    expect(firstRun.sheetName).toBe("Sheet A");
    expect(secondRun.sheetName).toBe("Sheet A");
    expect(firstRun.sheetSelectionDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheetName: "Sheet B",
          selectionReason: "lost_worksheet_index_tiebreak",
        }),
      ]),
    );
  });
});
