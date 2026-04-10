import {
  AllocationRunRouteError,
  loadAllocationRun,
} from "@/features/allocation/server/load-allocation-run";
import { buildExportVerificationReport } from "@/features/allocation/server/export-verification";

function errorBody(error: AllocationRunRouteError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    },
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  try {
    const savedRun = await loadAllocationRun(id);
    const verificationReport = await buildExportVerificationReport(savedRun);

    return Response.json({
      verificationReport,
      gate: verificationReport.gate,
    });
  } catch (error) {
    if (error instanceof AllocationRunRouteError) {
      return Response.json(errorBody(error), {
        status: error.status,
      });
    }

    return Response.json(
      errorBody(
        new AllocationRunRouteError(
          "Không thể xác minh export lúc này.",
          404,
          "allocation_export_verification_failed",
        ),
      ),
      { status: 500 },
    );
  }
}
