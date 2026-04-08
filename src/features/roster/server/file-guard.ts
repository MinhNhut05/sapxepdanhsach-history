export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SUPPORTED_XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

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
    }
  | {
      ok: false;
      code: FileGuardErrorCode;
      status: 400 | 413 | 415;
      message: string;
    };

function hasXlsxExtension(fileName: string): boolean {
  return fileName.toLocaleLowerCase("en-US").endsWith(".xlsx");
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

  if (!hasXlsxExtension(file.name) || !SUPPORTED_XLSX_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      code: "unsupported_file_type",
      status: 415,
      message: "Chỉ hỗ trợ tệp .xlsx hợp lệ.",
    };
  }

  return {
    ok: true,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
  };
}
