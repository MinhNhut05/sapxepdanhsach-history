import { describe, expect, it } from "vitest";

import { parseBirthDateValue } from "../../src/features/roster/lib/parse-birth-date";

describe("parseBirthDateValue", () => {
  it("supports Excel serial numbers, Date objects, and roster text formats", () => {
    expect(parseBirthDateValue(25569)).toMatchObject({
      ok: true,
      birthDateIso: "1970-01-01",
    });

    expect(parseBirthDateValue(new Date(2024, 3, 8))).toMatchObject({
      ok: true,
      birthDateIso: "2024-04-08",
    });

    expect(parseBirthDateValue("31/12/2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-12-31",
    });
    expect(parseBirthDateValue("13/9/2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-09-13",
    });
    expect(parseBirthDateValue("03/10/1985")).toMatchObject({
      ok: true,
      birthDateIso: "1985-10-03",
    });
    expect(parseBirthDateValue("10/8/1990")).toMatchObject({
      ok: true,
      birthDateIso: "1990-08-10",
    });
    expect(parseBirthDateValue("31-12-2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-12-31",
    });
    expect(parseBirthDateValue("13-11-2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-11-13",
    });
    expect(parseBirthDateValue("9-11-2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-11-09",
    });
    expect(parseBirthDateValue("2024-08-05")).toMatchObject({
      ok: true,
      birthDateIso: "2024-08-05",
    });
  });

  it("repairs 3-digit years only when a single plausible century exists", () => {
    expect(parseBirthDateValue("02/01/986")).toMatchObject({
      ok: true,
      birthDateIso: "1986-01-02",
      source: "text-short-year",
    });

    expect(parseBirthDateValue("03/6/987")).toMatchObject({
      ok: true,
      birthDateIso: "1987-06-03",
      source: "text-short-year",
    });

    expect(parseBirthDateValue("04/05/123")).toMatchObject({
      ok: false,
      severity: "blocking",
      code: "invalid_birth_date",
    });
  });
});
