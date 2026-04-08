import type { ImportIssue } from "@/features/roster/domain/import-issue";

import { normalizeVietnameseText } from "./normalize-vietnamese";

export const REQUIRED_ROSTER_HEADERS = {
  className: "Lớp",
  studentCode: "MSHV",
  middleName: "HỌ LÓT",
  firstName: "TÊN",
  birthDate: "NGÀY SINH",
  birthPlace: "NƠI SINH",
} as const;

export const OPTIONAL_ROSTER_HEADERS = {
  note: "GHI CHÚ",
} as const;

export type RosterHeaderKey =
  | keyof typeof REQUIRED_ROSTER_HEADERS
  | keyof typeof OPTIONAL_ROSTER_HEADERS;

export interface RosterHeaderMap {
  className: number;
  studentCode: number;
  middleName: number;
  firstName: number;
  birthDate: number;
  birthPlace: number;
  note?: number;
}

export interface RosterHeaderMapResult {
  ok: boolean;
  columns?: RosterHeaderMap;
  issues: ImportIssue[];
}

type HeaderRowInput = ReadonlyArray<unknown> | { values: ReadonlyArray<unknown> };

const HEADER_ALIASES: Record<RosterHeaderKey, string[]> = {
  className: ["Lớp", "Lop", "Tên lớp"],
  studentCode: ["MSHV", "Mã HV", "Ma hoc vien"],
  middleName: ["HỌ LÓT", "Họ lót", "Ho lot"],
  firstName: ["TÊN", "Ten", "First Name"],
  birthDate: ["NGÀY SINH", "Ngày sinh", "Ngay sinh", "DOB"],
  birthPlace: ["NƠI SINH", "Nơi sinh", "Noi sinh"],
  note: ["GHI CHÚ", "Ghi chú", "Ghi chu", "Note"],
};

const supportedHeaderEntries: Array<[RosterHeaderKey, string]> = Object.entries(
  HEADER_ALIASES,
).flatMap(([headerKey, aliases]) =>
  aliases.map((alias): [RosterHeaderKey, string] => [headerKey as RosterHeaderKey, alias]),
);

function toLookupKey(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return normalizeVietnameseText(value).toLocaleUpperCase("vi-VN");
}

function normalizeHeaderRow(headerRow: HeaderRowInput): ReadonlyArray<unknown> {
  const rawValues = Array.isArray(headerRow)
    ? headerRow
    : Array.from((headerRow as { values: ReadonlyArray<unknown> }).values);

  if (rawValues[0] === undefined) {
    return rawValues.slice(1);
  }

  return rawValues;
}

export function mapRosterHeaders(headerRow: HeaderRowInput): RosterHeaderMapResult {
  const normalizedCells = normalizeHeaderRow(headerRow);
  const resolvedColumns = {} as Partial<RosterHeaderMap>;

  for (const [index, value] of normalizedCells.entries()) {
    const headerLookupKey = toLookupKey(value);

    if (!headerLookupKey) {
      continue;
    }

    const matchedHeader = supportedHeaderEntries.find(
      ([, label]) => toLookupKey(label) === headerLookupKey,
    );

    if (!matchedHeader) {
      continue;
    }

    const [headerKey] = matchedHeader;

    if (resolvedColumns[headerKey] === undefined) {
      resolvedColumns[headerKey] = index + 1;
    }
  }

  const missingIssues = Object.entries(REQUIRED_ROSTER_HEADERS)
    .filter(([headerKey]) => resolvedColumns[headerKey as keyof RosterHeaderMap] === undefined)
    .map(([, label]) => {
      const issue: ImportIssue = {
        severity: "blocking",
        code: "missing_required_header",
        column: label,
        message: `Thiếu cột bắt buộc: ${label}.`,
      };

      return issue;
    });

  if (missingIssues.length > 0) {
    return {
      ok: false,
      issues: missingIssues,
    };
  }

  return {
    ok: true,
    columns: resolvedColumns as RosterHeaderMap,
    issues: [],
  };
}
