import { mapRosterHeaders } from "@/features/roster/lib/map-headers";

const MAX_HEADER_SCAN_ROWS = 8;

export interface HeaderRowDetection {
  headerRowIndex: number;
  headerValues: ReadonlyArray<unknown>;
  scannedRowCount: number;
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

export function detectHeaderRow(rows: ReadonlyArray<ReadonlyArray<unknown>>): HeaderRowDetection {
  let bestMatch: HeaderRowDetection | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let meaningfulRowsScanned = 0;

  for (let index = 0; index < rows.length && meaningfulRowsScanned < MAX_HEADER_SCAN_ROWS; index += 1) {
    const row = rows[index] ?? [];

    if (!rowHasMeaningfulValues(row)) {
      continue;
    }

    meaningfulRowsScanned += 1;

    const mapping = mapRosterHeaders(row);
    const score = mapping.ok && mapping.columns ? 100 : -mapping.issues.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        headerRowIndex: index,
        headerValues: row,
        scannedRowCount: meaningfulRowsScanned,
      };
    }

    if (mapping.ok) {
      return {
        headerRowIndex: index,
        headerValues: row,
        scannedRowCount: meaningfulRowsScanned,
      };
    }
  }

  return (
    bestMatch ?? {
      headerRowIndex: 0,
      headerValues: rows[0] ?? [],
      scannedRowCount: meaningfulRowsScanned,
    }
  );
}

export { MAX_HEADER_SCAN_ROWS };
