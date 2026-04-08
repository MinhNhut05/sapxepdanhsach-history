export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SUPPORTED_MIME_TYPES_BY_EXTENSION = {
  xlsx: new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
    "",
  ]),
  xls: new Set([
    "application/vnd.ms-excel",
    "application/octet-stream",
    "",
  ]),
  csv: new Set([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/octet-stream",
    "",
  ]),
} as const;

export type SupportedRosterExtension = keyof typeof SUPPORTED_MIME_TYPES_BY_EXTENSION;

export type FileGuardErrorCode =
  | "missing_file"
  | "unsupported_file_type"
  | "file_too_large";

export type FileGuardResult =
  | {
      ok: true;
      fileName: string;
      size: number;
      mimeType: string;
      detectedExtension: SupportedRosterExtension;
    }
  | {
      ok: false;
      code: FileGuardErrorCode;
      status: 400 | 413 | 415;
      message: string;
    };

function detectExtension(fileName: string): SupportedRosterExtension | null {
  const normalizedName = fileName.toLocaleLowerCase("en-US");

  if (normalizedName.endsWith(".xlsx")) {
    return "xlsx";
  }

  if (normalizedName.endsWith(".xls")) {
    return "xls";
  }

  if (normalizedName.endsWith(".csv")) {
    return "csv";
  }

  return null;
}

export function validateRosterUpload(file: File | null | undefined): FileGuardResult {
  if (!file) {
    return {
      ok: false,
      code: "missing_file",
      status: 400,
      message: "Thiếu tệp roster cần import.",
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "file_too_large",
      status: 413,
      message: `Tệp vượt quá giới hạn ${MAX_UPLOAD_BYTES} byte.`,
    };
  }

  const detectedExtension = detectExtension(file.name);

  if (!detectedExtension) {
    return {
      ok: false,
      code: "unsupported_file_type",
      status: 415,
      message: "Chỉ hỗ trợ tệp .xlsx, .xls, hoặc .csv hợp lệ.",
    };
  }

  const supportedMimeTypes = SUPPORTED_MIME_TYPES_BY_EXTENSION[detectedExtension];

  if (!supportedMimeTypes.has(file.type)) {
    return {
      ok: false,
      code: "unsupported_file_type",
      status: 415,
      message: "Chỉ hỗ trợ tệp .xlsx, .xls, hoặc .csv hợp lệ.",
    };
  }

  return {
    ok: true,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
    detectedExtension,
  };
}
