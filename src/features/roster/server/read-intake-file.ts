import * as XLSX from "xlsx";

import type { IntakeSourceFormat } from "@/features/roster/ui/import-state";

import { detectCsvFormat } from "./detect-csv-format";

export interface IntakeSheetSnapshot {
  sourceFormat: IntakeSourceFormat;
  sheetName: string;
  rows: string[][];
  rowCount: number;
}

interface ReadIntakeFileOptions {
  fileName: string;
  mimeType?: string;
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function inferSourceFormat(fileName: string): IntakeSourceFormat {
  const normalizedFileName = fileName.toLocaleLowerCase("en-US");

  if (normalizedFileName.endsWith(".xlsx")) {
    return "xlsx";
  }

  if (normalizedFileName.endsWith(".xls")) {
    return "xls";
  }

  if (normalizedFileName.endsWith(".csv")) {
    return "csv";
  }

  return "unknown";
}

function toWorkbookRows(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: "",
  });

  return rows.map((row) => row.map((cell) => normalizeCellValue(cell)));
}

function arrayBufferToBinaryString(input: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(input)).toString("binary");
}

function readWorkbookSnapshot(input: ArrayBuffer, sourceFormat: "xlsx" | "xls"): IntakeSheetSnapshot {
  const workbook = XLSX.read(arrayBufferToBinaryString(input), {
    type: "binary",
    dense: true,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0] ?? "Sheet1";
  const sheet = workbook.Sheets[sheetName];
  const rows = sheet ? toWorkbookRows(sheet) : [];

  return {
    sourceFormat,
    sheetName,
    rows,
    rowCount: rows.length,
  };
}

function readCsvSnapshot(input: ArrayBuffer): IntakeSheetSnapshot {
  const detected = detectCsvFormat(input);
  const text = new TextDecoder(detected.encoding === "windows-1258" || detected.encoding === "windows-1252" ? "latin1" : detected.encoding).decode(
    new Uint8Array(input),
  );
  const workbook = XLSX.read(text, {
    type: "string",
    raw: false,
    dense: true,
    FS: detected.delimiter,
    codepage: detected.encoding === "windows-1258" ? 1258 : detected.encoding === "windows-1252" ? 1252 : undefined,
  });
  const sheetName = workbook.SheetNames[0] ?? "CSV";
  const sheet = workbook.Sheets[sheetName];
  const rows = sheet ? toWorkbookRows(sheet) : [];

  return {
    sourceFormat: "csv",
    sheetName,
    rows,
    rowCount: rows.length,
  };
}

export async function readIntakeFile(
  input: ArrayBuffer,
  options: ReadIntakeFileOptions,
): Promise<IntakeSheetSnapshot> {
  const sourceFormat = inferSourceFormat(options.fileName);

  if (sourceFormat === "xlsx" || sourceFormat === "xls") {
    return readWorkbookSnapshot(input, sourceFormat);
  }

  if (sourceFormat === "csv") {
    return readCsvSnapshot(input);
  }

  return {
    sourceFormat: "unknown",
    sheetName: options.fileName,
    rows: [],
    rowCount: 0,
  };
}
