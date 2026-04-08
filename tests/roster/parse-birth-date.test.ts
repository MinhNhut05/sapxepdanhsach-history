import { describe, expect, it } from "vitest";

import { parseBirthDateValue } from "../../src/features/roster/lib/parse-birth-date";

describe("parseBirthDateValue", () => {
  it("supports Excel serial numbers, Date objects, and allowed text formats", () => {
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
    expect(parseBirthDateValue("31-12-2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-12-31",
    });
    expect(parseBirthDateValue("13-11-2024")).toMatchObject({
      ok: true,
      birthDateIso: "2024-11-13",
    });
    expect(parseBirthDateValue("9-11-2024")).toMatchObject({
      ok: false,
      severity: "blocking",
      code: "ambiguous_birth_date",
    });
    expect(parseBirthDateValue("2024-08-05")).toMatchObject({
      ok: true,
      birthDateIso: "2024-08-05",
    });
  });

  it("rejects ambiguous text dates instead of guessing", () => {
    expect(parseBirthDateValue("04/05/2024")).toMatchObject({
      ok: false,
      severity: "blocking",
      code: "ambiguous_birth_date",
    });
  });
});
