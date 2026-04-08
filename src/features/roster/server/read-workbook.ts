import { Workbook } from "exceljs";

import type { ImportIssue } from "@/features/roster/domain/import-issue";

export interface WorkbookRowSnapshot {
  rowNumber: number;
  values: ReadonlyArray<unknown>;
}

type WorkbookLoadInput = Parameters<Workbook["xlsx"]["load"]>[0];

export type ReadWorkbookResult =
  | {
      ok: true;
      worksheetName: string;
      headerRow: WorkbookRowSnapshot;
      dataRows: WorkbookRowSnapshot[];
    }
  | {
      ok: false;
      issues: ImportIssue[];
    };

function normalizeBuffer(input: ArrayBuffer | Buffer | Uint8Array): Uint8Array {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  return input;
}

function rowValuesWithoutExcelIndex(values: unknown[] | { [key: number]: unknown }): unknown[] {
  const normalizedValues = Array.isArray(values)
    ? values
    : Object.keys(values)
        .map(Number)
        .sort((left, right) => left - right)
        .map((columnIndex) => values[columnIndex]);

  if (normalizedValues[0] === undefined) {
    return normalizedValues.slice(1);
  }

  return normalizedValues;
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

function createRowSnapshot(
  rowNumber: number,
  values: unknown[] | { [key: number]: unknown },
): WorkbookRowSnapshot {
  return {
    rowNumber,
    values: rowValuesWithoutExcelIndex(values),
  };
}

export async function readWorkbook(
  input: ArrayBuffer | Buffer | Uint8Array,
): Promise<ReadWorkbookResult> {
  const workbook = new Workbook();

  try {
    await workbook.xlsx.load(normalizeBuffer(input) as unknown as WorkbookLoadInput);
  } catch {
    return {
      ok: false,
      issues: [
        {
          severity: "blocking",
          code: "invalid_workbook",
          message: "Không thể đọc nội dung workbook .xlsx.",
        },
      ],
    };
  }

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return {
      ok: false,
      issues: [
        {
          severity: "blocking",
          code: "empty_workbook",
          message: "Workbook không có worksheet nào để import.",
        },
      ],
    };
  }

  const lastRowNumber = worksheet.lastRow?.number ?? 0;
  let firstNonEmptyRowNumber: number | null = null;

  for (let rowNumber = 1; rowNumber <= lastRowNumber; rowNumber += 1) {
    const snapshot = createRowSnapshot(rowNumber, worksheet.getRow(rowNumber).values);

    if (rowHasMeaningfulValues(snapshot.values)) {
      firstNonEmptyRowNumber = rowNumber;
      break;
    }
  }

  if (firstNonEmptyRowNumber === null) {
    return {
      ok: false,
      issues: [
        {
          severity: "blocking",
          code: "empty_workbook",
          message: "Worksheet đầu tiên không có dữ liệu.",
        },
      ],
    };
  }

  if (firstNonEmptyRowNumber !== 1) {
    return {
      ok: false,
      issues: [
        {
          severity: "blocking",
          code: "header_row_not_first",
          row: firstNonEmptyRowNumber,
          message: "Header phải nằm ở dòng 1 của worksheet đầu tiên.",
        },
      ],
    };
  }

  const headerRow = createRowSnapshot(1, worksheet.getRow(1).values);

  if (!rowHasMeaningfulValues(headerRow.values)) {
    return {
      ok: false,
      issues: [
        {
          severity: "blocking",
          code: "empty_header_row",
          row: 1,
          message: "Dòng header của worksheet đầu tiên không được để trống.",
        },
      ],
    };
  }

  const dataRows: WorkbookRowSnapshot[] = [];

  for (let rowNumber = 2; rowNumber <= lastRowNumber; rowNumber += 1) {
    dataRows.push(createRowSnapshot(rowNumber, worksheet.getRow(rowNumber).values));
  }

  return {
    ok: true,
    worksheetName: worksheet.name,
    headerRow,
    dataRows,
  };
}
