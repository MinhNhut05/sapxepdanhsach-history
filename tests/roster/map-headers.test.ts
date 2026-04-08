import { describe, expect, it } from "vitest";

import {
  mapRosterHeaders,
  OPTIONAL_ROSTER_HEADERS,
  REQUIRED_ROSTER_HEADERS,
} from "../../src/features/roster/lib/map-headers";

describe("mapRosterHeaders", () => {
  it("maps required columns even when the order changes and extra columns exist", () => {
    const result = mapRosterHeaders([
      "MSHV",
      "TÊN",
      "NƠI SINH",
      "Lớp",
      "HỌ LÓT",
      "NGÀY SINH",
      "CỘT THỪA",
    ]);

    expect(result).toMatchObject({
      ok: true,
      columns: {
        className: 4,
        studentCode: 1,
        middleName: 5,
        firstName: 2,
        birthDate: 6,
        birthPlace: 3,
      },
    });
  });

  it("supports light normalization and the optional GHI CHÚ column", () => {
    const result = mapRosterHeaders([
      " lớp ",
      "mshv",
      "họ lót",
      "tên",
      "ngày sinh",
      "nơi sinh",
      " ghi chú ",
    ]);

    expect(result).toMatchObject({
      ok: true,
      columns: {
        className: 1,
        studentCode: 2,
        middleName: 3,
        firstName: 4,
        birthDate: 5,
        birthPlace: 6,
        note: 7,
      },
    });
  });

  it("keeps the optional note column absent without failing", () => {
    const result = mapRosterHeaders([
      REQUIRED_ROSTER_HEADERS.className,
      REQUIRED_ROSTER_HEADERS.studentCode,
      REQUIRED_ROSTER_HEADERS.middleName,
      REQUIRED_ROSTER_HEADERS.firstName,
      REQUIRED_ROSTER_HEADERS.birthDate,
      REQUIRED_ROSTER_HEADERS.birthPlace,
    ]);

    expect(result.ok).toBe(true);
    expect(result.columns?.note).toBeUndefined();
    expect(OPTIONAL_ROSTER_HEADERS.note).toBe("GHI CHÚ");
  });

  it("returns a blocking issue when a required header is missing", () => {
    const result = mapRosterHeaders([
      REQUIRED_ROSTER_HEADERS.className,
      REQUIRED_ROSTER_HEADERS.studentCode,
      REQUIRED_ROSTER_HEADERS.middleName,
      REQUIRED_ROSTER_HEADERS.firstName,
      REQUIRED_ROSTER_HEADERS.birthDate,
    ]);

    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          severity: "blocking",
          code: "missing_required_header",
          column: "NƠI SINH",
        },
      ],
    });
  });
});
