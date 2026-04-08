import type { RawBirthDateValue } from "@/features/roster/domain/student-record";

export const SUPPORTED_TEXT_BIRTH_DATE_FORMATS = [
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd-MM-yyyy",
  "d-M-yyyy",
  "dd.MM.yyyy",
  "d.M.yyyy",
  "yyyy-MM-dd",
] as const;

type BirthDateParseErrorCode =
  | "birth_date_required"
  | "invalid_birth_date";

export type BirthDateParseResult =
  | {
      ok: true;
      birthDateIso: string;
      source: "date-object" | "excel-serial" | "text" | "text-short-year";
    }
  | {
      ok: false;
      severity: "blocking";
      code: BirthDateParseErrorCode;
      message: string;
      rawValue: RawBirthDateValue;
    };

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_SUPPORTED_BIRTH_YEAR = 1900;

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function daysInMonth(year: number, month: number): number {
  return [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
}

function toIsoDate(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > daysInMonth(year, month)) {
    return false;
  }

  return true;
}

function resolveTextBirthYear(
  yearText: string,
): { year: number; source: "text" | "text-short-year" } | null {
  if (/^\d{4}$/.test(yearText)) {
    return {
      year: Number(yearText),
      source: "text",
    };
  }

  if (!/^\d{3}$/.test(yearText)) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const candidateYears = [`1${yearText}`, `2${yearText}`]
    .map(Number)
    .filter(
      (year, index, years) =>
        Number.isInteger(year) &&
        year >= MIN_SUPPORTED_BIRTH_YEAR &&
        year <= currentYear &&
        years.indexOf(year) === index,
    );

  if (candidateYears.length !== 1) {
    return null;
  }

  return {
    year: candidateYears[0],
    source: "text-short-year",
  };
}

function parseDateObject(value: Date): BirthDateParseResult {
  if (Number.isNaN(value.getTime())) {
    return {
      ok: false,
      severity: "blocking",
      code: "invalid_birth_date",
      message: "Ngày sinh không hợp lệ.",
      rawValue: value,
    };
  }

  return {
    ok: true,
    birthDateIso: toIsoDate(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    ),
    source: "date-object",
  };
}

function parseExcelSerial(value: number): BirthDateParseResult {
  if (!Number.isFinite(value) || value <= 0) {
    return {
      ok: false,
      severity: "blocking",
      code: "invalid_birth_date",
      message: "Số serial Excel của ngày sinh không hợp lệ.",
      rawValue: value,
    };
  }

  const serialDate = new Date(
    EXCEL_EPOCH_UTC + Math.floor(value) * MILLISECONDS_PER_DAY,
  );

  return {
    ok: true,
    birthDateIso: toIsoDate(
      serialDate.getUTCFullYear(),
      serialDate.getUTCMonth() + 1,
      serialDate.getUTCDate(),
    ),
    source: "excel-serial",
  };
}

function parseTextDate(value: string): BirthDateParseResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      ok: false,
      severity: "blocking",
      code: "birth_date_required",
      message: "Ngày sinh là bắt buộc.",
      rawValue: value,
    };
  }

  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (!isValidCalendarDate(year, month, day)) {
      return {
        ok: false,
        severity: "blocking",
        code: "invalid_birth_date",
        message: "Ngày sinh không đúng định dạng hỗ trợ.",
        rawValue: value,
      };
    }

    return {
      ok: true,
      birthDateIso: toIsoDate(year, month, day),
      source: "text",
    };
  }

  const dayFirstMatch = trimmedValue.match(/^(\d{1,2})([\/\-.])(\d{1,2})\2(\d{3,4})$/);

  if (!dayFirstMatch) {
    return {
      ok: false,
      severity: "blocking",
      code: "invalid_birth_date",
      message: "Ngày sinh phải thuộc các định dạng hỗ trợ.",
      rawValue: value,
    };
  }

  const [, dayText, , monthText, yearText] = dayFirstMatch;
  const day = Number(dayText);
  const month = Number(monthText);
  const resolvedYear = resolveTextBirthYear(yearText);

  if (!resolvedYear) {
    return {
      ok: false,
      severity: "blocking",
      code: "invalid_birth_date",
      message: "Ngày sinh không đúng định dạng hỗ trợ.",
      rawValue: value,
    };
  }

  const year = resolvedYear.year;

  if (!isValidCalendarDate(year, month, day)) {
    return {
      ok: false,
      severity: "blocking",
      code: "invalid_birth_date",
      message: "Ngày sinh không đúng định dạng hỗ trợ.",
      rawValue: value,
    };
  }

  return {
    ok: true,
    birthDateIso: toIsoDate(year, month, day),
    source: resolvedYear.source,
  };
}

export function parseBirthDateValue(value: RawBirthDateValue): BirthDateParseResult {
  if (value instanceof Date) {
    return parseDateObject(value);
  }

  if (typeof value === "number") {
    return parseExcelSerial(value);
  }

  if (typeof value === "string") {
    return parseTextDate(value);
  }

  return {
    ok: false,
    severity: "blocking",
    code: "birth_date_required",
    message: "Ngày sinh là bắt buộc.",
    rawValue: value,
  };
}
