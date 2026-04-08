import { listAllocationRuns } from "@/features/allocation/server/list-allocation-runs";
import { saveAllocationRun } from "@/features/allocation/server/save-allocation-run";
import {
  AllocationRouteError,
  runAllocation,
} from "@/features/allocation/server/run-allocation";

const MAX_ALLOCATION_REQUEST_BYTES = 5_000_000;

class RequestPayloadError extends Error {
  constructor(
    readonly status: 400 | 413,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RequestPayloadError";
  }
}

function errorBody(error: AllocationRouteError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    },
  };
}

function internalErrorBody(code: string, message: string) {
  return {
    error: {
      code,
      message,
      details: null,
    },
  };
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (
    contentLength &&
    Number.isFinite(Number(contentLength)) &&
    Number(contentLength) > MAX_ALLOCATION_REQUEST_BYTES
  ) {
    throw new RequestPayloadError(
      413,
      "payload_too_large",
      "Payload phân phòng vượt quá giới hạn cho phép.",
    );
  }

  if (!request.body) {
    throw new RequestPayloadError(400, "invalid_json", "Malformed JSON payload");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let rawBody = "";
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > MAX_ALLOCATION_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestPayloadError(
        413,
        "payload_too_large",
        "Payload phân phòng vượt quá giới hạn cho phép.",
      );
    }

    rawBody += decoder.decode(value, { stream: true });
  }

  rawBody += decoder.decode();

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new RequestPayloadError(400, "invalid_json", "Malformed JSON payload");
  }
}

export async function GET(): Promise<Response> {
  try {
    const history = await listAllocationRuns();

    return Response.json(history, { status: 200 });
  } catch {
    return Response.json(
      internalErrorBody(
        "allocation_history_load_failed",
        "Không thể tải lịch sử phân phòng lúc này.",
      ),
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestPayloadError) {
      return Response.json(internalErrorBody(error.code, error.message), {
        status: error.status,
      });
    }

    return Response.json(
      internalErrorBody("invalid_json", "Malformed JSON payload"),
      { status: 400 },
    );
  }

  let allocationRun;

  try {
    allocationRun = runAllocation(payload);
  } catch (error) {
    if (error instanceof AllocationRouteError) {
      return Response.json(errorBody(error), {
        status: error.status,
      });
    }

    return Response.json(
      internalErrorBody("allocation_failed", "Không thể tạo kết quả phân phòng."),
      { status: 500 },
    );
  }

  try {
    const savedRun = await saveAllocationRun(allocationRun);

    return Response.json(savedRun, { status: 200 });
  } catch {
    return Response.json(
      internalErrorBody(
        "allocation_persist_failed",
        "Không thể lưu kết quả phân phòng lúc này.",
      ),
      { status: 503 },
    );
  }
}
