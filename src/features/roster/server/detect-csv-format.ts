const CSV_DELIMITERS = [",", ";", "\t", "|"] as const;
const CSV_ENCODINGS = ["utf-8", "utf-16le", "windows-1258", "windows-1252"] as const;
const MAX_PREVIEW_LINES = 12;

export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];
export type CsvEncoding = (typeof CSV_ENCODINGS)[number];

export interface DetectedCsvFormat {
  delimiter: CsvDelimiter;
  encoding: CsvEncoding;
  previewLines: string[];
}

function decodeWithEncoding(input: ArrayBuffer | Uint8Array, encoding: CsvEncoding): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (encoding === "windows-1252" || encoding === "windows-1258") {
    return Buffer.from(bytes).toString("latin1");
  }

  return new TextDecoder(encoding).decode(bytes);
}

function normalizePreviewLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_PREVIEW_LINES);
}

function countDelimiterHits(line: string, delimiter: CsvDelimiter): number {
  return line.split(delimiter).length - 1;
}

function scoreDelimiter(lines: string[], delimiter: CsvDelimiter): number {
  const counts = lines
    .map((line) => countDelimiterHits(line, delimiter))
    .filter((count) => count > 0);

  if (counts.length === 0) {
    return -1;
  }

  const consistencyBonus = counts.every((count) => count === counts[0]) ? 3 : 0;
  const coverageBonus = counts.length;
  const separatorCount = counts.reduce((sum, count) => sum + count, 0);

  return separatorCount + consistencyBonus + coverageBonus;
}

export function detectCsvFormat(input: ArrayBuffer | Uint8Array): DetectedCsvFormat {
  let bestMatch: DetectedCsvFormat | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const encoding of CSV_ENCODINGS) {
    const decodedText = decodeWithEncoding(input, encoding);
    const previewLines = normalizePreviewLines(decodedText);

    if (previewLines.length === 0) {
      continue;
    }

    for (const delimiter of CSV_DELIMITERS) {
      const score = scoreDelimiter(previewLines, delimiter);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          delimiter,
          encoding,
          previewLines,
        };
      }
    }
  }

  return (
    bestMatch ?? {
      delimiter: ",",
      encoding: "utf-8",
      previewLines: [],
    }
  );
}
