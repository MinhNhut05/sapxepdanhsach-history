import * as XLSX from "xlsx";

import { mapRosterHeaders, type RosterHeaderMapResult } from "@/features/roster/lib/map-headers";
import type { IntakeSourceFormat } from "@/features/roster/ui/import-state";

import { detectCsvFormat } from "./detect-csv-format";
import { detectHeaderRow } from "./detect-header-row";

export interface IntakeSheetSelectionDiagnostic {
  sheetName: string;
  worksheetIndex: number;
  requiredMatches: number;
  totalMatches: number;
  dataRowCount: number;
  headerRowIndex: number;
  selectionReason: string;
}

export interface IntakeSheetSnapshot {
  sourceFormat: IntakeSourceFormat;
  sheetName: string;
  rows: string[][];
  rowCount: number;
  selectedSheet: IntakeSheetSelectionDiagnostic;
  scannedSheetCount: number;
  sheetSelectionDiagnostics: IntakeSheetSelectionDiagnostic[];
}

interface ReadIntakeFileOptions {
  fileName: string;
  mimeType?: string;
}

interface WorksheetCandidate {
  sheetName: string;
  worksheetIndex: number;
  rows: string[][];
  headerRowIndex: number;
  requiredMatches: number;
  totalMatches: number;
  dataRowCount: number;
  headerMapResult: RosterHeaderMapResult;
}

const REQUIRED_HEADER_KEYS = [
  "className",
  "studentCode",
  "middleName",
  "firstName",
  "birthDate",
  "birthPlace",
] as const;

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
    raw: true,
    blankrows: false,
    defval: "",
  });

  return rows.map((row) => row.map((cell) => normalizeCellValue(cell)));
}

function arrayBufferToBinaryString(input: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(input)).toString("binary");
}

function rowHasMeaningfulValues(values: ReadonlyArray<unknown>): boolean {
  return values.some((value) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return true;
  });
}

function countHeaderMatches(headerMapResult: RosterHeaderMapResult): {
  requiredMatches: number;
  totalMatches: number;
} {
  if (!headerMapResult.columns) {
    return {
      requiredMatches: REQUIRED_HEADER_KEYS.length - headerMapResult.issues.length,
      totalMatches: 0,
    };
  }

  const requiredMatches = REQUIRED_HEADER_KEYS.filter(
    (headerKey) => headerMapResult.columns?.[headerKey] !== undefined,
  ).length;
  const totalMatches = Object.values(headerMapResult.columns).filter(
    (columnIndex) => columnIndex !== undefined,
  ).length;

  return {
    requiredMatches,
    totalMatches,
  };
}

function countDataRows(rows: ReadonlyArray<ReadonlyArray<string>>, headerRowIndex: number): number {
  return rows
    .slice(headerRowIndex + 1)
    .filter((row) => rowHasMeaningfulValues(row))
    .length;
}

function scoreWorksheetCandidate(
  sheetName: string,
  worksheetIndex: number,
  rows: string[][],
): WorksheetCandidate {
  const detectedHeader = detectHeaderRow(rows);
  const headerMapResult = mapRosterHeaders(detectedHeader.headerValues);
  const { requiredMatches, totalMatches } = countHeaderMatches(headerMapResult);
  const dataRowCount = countDataRows(rows, detectedHeader.headerRowIndex);

  return {
    sheetName,
    worksheetIndex,
    rows,
    headerRowIndex: detectedHeader.headerRowIndex,
    requiredMatches,
    totalMatches,
    dataRowCount,
    headerMapResult,
  };
}

function compareWorksheetCandidates(a: WorksheetCandidate, b: WorksheetCandidate): number {
  if (a.requiredMatches !== b.requiredMatches) {
    return b.requiredMatches - a.requiredMatches;
  }

  if (a.totalMatches !== b.totalMatches) {
    return b.totalMatches - a.totalMatches;
  }

  if (a.dataRowCount !== b.dataRowCount) {
    return b.dataRowCount - a.dataRowCount;
  }

  if (a.headerRowIndex !== b.headerRowIndex) {
    return a.headerRowIndex - b.headerRowIndex;
  }

  return a.worksheetIndex - b.worksheetIndex;
}

function createSelectionReason(
  candidate: WorksheetCandidate,
  selectedCandidate: WorksheetCandidate,
): string {
  if (candidate.sheetName === selectedCandidate.sheetName) {
    if (candidate.requiredMatches !== REQUIRED_HEADER_KEYS.length) {
      return "selected_best_available_candidate";
    }

    if (candidate.dataRowCount === 0) {
      return "selected_only_header_match";
    }

    return "selected_best_candidate";
  }

  if (candidate.requiredMatches !== selectedCandidate.requiredMatches) {
    return "lost_required_header_tiebreak";
  }

  if (candidate.totalMatches !== selectedCandidate.totalMatches) {
    return "lost_total_header_tiebreak";
  }

  if (candidate.dataRowCount !== selectedCandidate.dataRowCount) {
    return "lost_data_row_tiebreak";
  }

  if (candidate.headerRowIndex !== selectedCandidate.headerRowIndex) {
    return "lost_header_row_index_tiebreak";
  }

  return "lost_worksheet_index_tiebreak";
}

function toSelectionDiagnostic(
  candidate: WorksheetCandidate,
  selectedCandidate: WorksheetCandidate,
): IntakeSheetSelectionDiagnostic {
  return {
    sheetName: candidate.sheetName,
    worksheetIndex: candidate.worksheetIndex,
    requiredMatches: candidate.requiredMatches,
    totalMatches: candidate.totalMatches,
    dataRowCount: candidate.dataRowCount,
    headerRowIndex: candidate.headerRowIndex,
    selectionReason: createSelectionReason(candidate, selectedCandidate),
  };
}

function readWorkbookSnapshot(input: ArrayBuffer, sourceFormat: "xlsx" | "xls"): IntakeSheetSnapshot {
  const workbook = XLSX.read(arrayBufferToBinaryString(input), {
    type: "binary",
    dense: true,
    raw: false,
  });

  const candidates = workbook.SheetNames.map((sheetName, worksheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = sheet ? toWorkbookRows(sheet) : [];

    return scoreWorksheetCandidate(sheetName, worksheetIndex, rows);
  });

  const selectedCandidate =
    candidates.toSorted(compareWorksheetCandidates)[0] ??
    scoreWorksheetCandidate("Sheet1", 0, []);
  const sheetSelectionDiagnostics = candidates.map((candidate) =>
    toSelectionDiagnostic(candidate, selectedCandidate),
  );
  const selectedSheet =
    sheetSelectionDiagnostics.find(
      (candidate) => candidate.sheetName === selectedCandidate.sheetName,
    ) ?? toSelectionDiagnostic(selectedCandidate, selectedCandidate);

  return {
    sourceFormat,
    sheetName: selectedCandidate.sheetName,
    rows: selectedCandidate.rows,
    rowCount: selectedCandidate.rows.length,
    selectedSheet,
    scannedSheetCount: candidates.length,
    sheetSelectionDiagnostics,
  };
}

function readCsvSnapshot(input: ArrayBuffer): IntakeSheetSnapshot {
  const detected = detectCsvFormat(input);
  const text = new TextDecoder(
    detected.encoding === "windows-1258" || detected.encoding === "windows-1252"
      ? "latin1"
      : detected.encoding,
  ).decode(new Uint8Array(input));
  const workbook = XLSX.read(text, {
    type: "string",
    raw: false,
    dense: true,
    FS: detected.delimiter,
    codepage:
      detected.encoding === "windows-1258"
        ? 1258
        : detected.encoding === "windows-1252"
          ? 1252
          : undefined,
  });
  const sheetName = workbook.SheetNames[0] ?? "CSV";
  const sheet = workbook.Sheets[sheetName];
  const rows = sheet ? toWorkbookRows(sheet) : [];
  const selectedSheet: IntakeSheetSelectionDiagnostic = {
    sheetName,
    worksheetIndex: 0,
    requiredMatches: 0,
    totalMatches: 0,
    dataRowCount: Math.max(rows.length - 1, 0),
    headerRowIndex: 0,
    selectionReason: "single_sheet_source",
  };

  return {
    sourceFormat: "csv",
    sheetName,
    rows,
    rowCount: rows.length,
    selectedSheet,
    scannedSheetCount: 1,
    sheetSelectionDiagnostics: [selectedSheet],
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
    selectedSheet: {
      sheetName: options.fileName,
      worksheetIndex: 0,
      requiredMatches: 0,
      totalMatches: 0,
      dataRowCount: 0,
      headerRowIndex: 0,
      selectionReason: "unsupported_source_format",
    },
    scannedSheetCount: 0,
    sheetSelectionDiagnostics: [],
  };
}
