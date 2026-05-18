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
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const roomValue = new URL(request.url).searchParams.get("room");
  const roomNumber = roomValue ? Number(roomValue) : null;

  try {
    const savedRun = await loadAllocationRun(id);
    const requestedRoom =
      roomValue === null
        ? null
        : Number.isInteger(roomNumber) && roomNumber !== null && roomNumber > 0
          ? roomNumber
          : (() => {
              throw new AllocationRunRouteError(
                "Số phòng cần xuất không hợp lệ.",
                404,
                "allocation_room_not_found",
              );
            })();

    if (
      requestedRoom !== null &&
      !savedRun.rooms.some((room) => room.roomNumber === requestedRoom)
    ) {
      throw new AllocationRunRouteError(
        "Không tìm thấy phòng cần xuất trong saved run này.",
        404,
        "allocation_room_not_found",
      );
    }

    const exportResult = await exportAllocationWorkbook(savedRun, {
      roomNumber: requestedRoom ?? undefined,
    });
    const responseBody = Buffer.from(exportResult.bytes);
    const fileName =
      requestedRoom === null
        ? `phan-phong-${id}.xlsx`
        : `phan-phong-${id}-phong-${String(requestedRoom).padStart(2, "0")}.xlsx`;

    return new Response(responseBody, {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${fileName}"`,
        "content-length": String(responseBody.byteLength),
        "x-export-template-version": exportResult.templateVersion,
        "x-export-mode": exportResult.exportMode,
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
