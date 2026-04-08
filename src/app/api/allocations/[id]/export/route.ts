import {
  AllocationRunRouteError,
  loadAllocationRun,
} from "@/features/allocation/server/load-allocation-run";
import { exportAllocationWorkbook } from "@/features/allocation/server/export-allocation-workbook";

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
    const workbookBytes = await exportAllocationWorkbook(savedRun);
    const responseBody = Buffer.from(workbookBytes);

    return new Response(responseBody, {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="phan-phong-${id}.xlsx"`,
        "content-length": String(responseBody.byteLength),
      },
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
          "Không thể xuất workbook phân phòng lúc này.",
          404,
          "allocation_export_failed",
        ),
      ),
      { status: 500 },
    );
  }
}
