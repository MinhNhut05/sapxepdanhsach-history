import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { detectCsvFormat } from "../../src/features/roster/server/detect-csv-format";
import { readIntakeFile } from "../../src/features/roster/server/read-intake-file";

async function buildXlsxBuffer(rows: unknown[][]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Roster");

  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

function buildXlsBuffer(rows: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Roster");
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
        ["Lớp", "MSHV", "TÊN"],
        ["K19A", "MS001", "An"],
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
        ["Lớp", "MSHV", "TÊN"],
        ["K19B", "MS002", "Bình"],
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
});
