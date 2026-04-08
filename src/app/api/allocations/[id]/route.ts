import { loadAllocationRun, AllocationRunRouteError } from "@/features/allocation/server/load-allocation-run";
import { saveManualEdits } from "@/features/allocation/server/save-manual-edits";

function errorBody(error: AllocationRunRouteError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    },
  };
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AllocationRunRouteError(
      "Malformed JSON payload",
      400,
      "malformed_payload",
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  try {
    const savedRun = await loadAllocationRun(id);

    return Response.json(savedRun, { status: 200 });
  } catch (error) {
    if (error instanceof AllocationRunRouteError) {
      return Response.json(errorBody(error), {
        status: error.status,
      });
    }

    return Response.json(
      errorBody(
        new AllocationRunRouteError(
          "Không thể tải saved run lúc này.",
          400,
          "allocation_run_load_failed",
        ),
      ),
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  let payload: unknown;

  try {
    payload = await readJsonBody(request);
  } catch (error) {
    if (error instanceof AllocationRunRouteError) {
      return Response.json(errorBody(error), {
        status: error.status,
      });
    }

    return Response.json(
      errorBody(
        new AllocationRunRouteError(
          "Malformed JSON payload",
          400,
          "malformed_payload",
        ),
      ),
      { status: 400 },
    );
  }

  try {
    const savedRun = await saveManualEdits(id, payload);

    return Response.json(savedRun, { status: 200 });
  } catch (error) {
    if (error instanceof AllocationRunRouteError) {
      return Response.json(errorBody(error), {
        status: error.status,
      });
    }

    return Response.json(
      errorBody(
        new AllocationRunRouteError(
          "Không thể lưu manual edits lúc này.",
          400,
          "manual_edit_save_failed",
        ),
      ),
      { status: 500 },
    );
  }
}
