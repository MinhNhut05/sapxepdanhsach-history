import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AllocationOutputRow } from "../../src/features/allocation/domain/allocation-types";
import { PrintRoomActions } from "../../src/features/allocation/ui/print-room-actions";
import { PrintRoomView } from "../../src/features/allocation/ui/print-room-view";

function createRow(
  roomNumber: number,
  seatIndex: number,
  studentNumber: string,
): AllocationOutputRow {
  return {
    roomLabel: `Phòng ${roomNumber}`,
    roomNumber,
    candidateNumber: `P${String(roomNumber).padStart(2, "0")}-${String(
      seatIndex,
    ).padStart(3, "0")}`,
    seatIndex,
    className: "K19A",
    studentCode: `MS${studentNumber}`,
    middleName: "Hoc Vien",
    firstName: studentNumber,
    fullName: `Hoc Vien ${studentNumber}`,
    birthDateIso: "2001-01-01",
    birthPlace: "Hue",
    note: null,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrintRoomView", () => {
  it("renders Phòng 1 rows from authoritative output data and triggers window.print", () => {
    const printMock = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: printMock,
    });

    render(
      <>
        <PrintRoomActions />
        <PrintRoomView
          roomNumber={1}
          rows={[createRow(1, 1, "001"), createRow(1, 2, "002")]}
          sourceFileName="K19A.xlsx"
          generatedAt="2026-04-08T06:10:00.000Z"
        />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Phòng 1" })).toBeInTheDocument();
    expect(screen.getByText("P01-001")).toBeInTheDocument();
    expect(screen.getByText("P01-002")).toBeInTheDocument();
    expect(screen.getByText("Ngày sinh")).toBeInTheDocument();
    expect(screen.getByText("Nơi sinh")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /In danh sách phòng này/i }));

    expect(printMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".screen-only")).not.toBeNull();
    expect(document.querySelector(".print-only")).not.toBeNull();
  });
});
