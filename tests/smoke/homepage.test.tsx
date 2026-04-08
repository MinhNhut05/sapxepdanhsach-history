import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../../src/app/page";

describe("HomePage", () => {
  it("renders the Vietnamese upload shell copy", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "ExamRoomAllocator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sẵn sàng nhận file \.xlsx/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chấp nhận đúng định dạng `.xlsx`/i),
    ).toBeInTheDocument();
  });
});
