import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HomePage from "../../src/app/page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HomePage", () => {
  it("renders the integrated allocation workspace shell", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "/api/allocations" && (!init?.method || init.method === "GET")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                retention: {
                  days: 30,
                  basis: "last_activity",
                },
                runs: [],
              }),
          } satisfies Partial<Response>;
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      }),
    );

    render(<HomePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Chưa có saved run nào còn trong retention window."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "ExamRoomAllocator" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Không gian điều phối/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tệp roster/i)).toBeInTheDocument();
  });
});
