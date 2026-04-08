import { describe, expect, it } from "vitest";

import type { CanonicalStudentRecord } from "../../src/features/roster/domain/student-record";
import {
  normalizeVietnameseText,
  toDisplayNameCase,
} from "../../src/features/roster/lib/normalize-vietnamese";
import { sortStudentsByVietnameseName } from "../../src/features/roster/lib/sort-students";

function createStudent(
  rowIndex: number,
  firstName: string,
  middleName: string,
  studentCode: string,
): CanonicalStudentRecord {
  return {
    rowIndex,
    raw: {
      className: "K19A",
      studentCode,
      middleName,
      firstName,
      birthDate: "2001-01-01",
      birthPlace: "Huế",
      note: null,
    },
    canonical: {
      className: "K19A",
      studentCode,
      middleName,
      firstName,
      fullName: `${middleName} ${firstName}`.trim(),
      birthDateIso: "2001-01-01",
      birthPlace: "Huế",
      note: null,
    },
    birthDateIso: "2001-01-01",
  };
}

describe("normalizeVietnameseText", () => {
  it("keeps Vietnamese diacritics while collapsing whitespace", () => {
    expect(normalizeVietnameseText("  Nguyễn   Thị   Ánh  ")).toBe(
      "Nguyễn Thị Ánh",
    );
  });
});

describe("toDisplayNameCase", () => {
  it("title-cases Vietnamese names token by token and preserves hyphens", () => {
    expect(toDisplayNameCase("  nGUYỄN   thị   hẢi-yẾn  ")).toBe(
      "Nguyễn Thị Hải-Yến",
    );
  });
});

describe("sortStudentsByVietnameseName", () => {
  it("sorts by first name, then middle name, then student code", () => {
    const students = [
      createStudent(3, "Anh", "Nguyễn Minh", "MS002"),
      createStudent(2, "Anh", "Nguyễn Minh", "MS001"),
      createStudent(1, "Ân", "Trần Gia", "MS003"),
      createStudent(4, "Bình", "Đỗ Ngọc", "MS004"),
    ];

    expect(
      sortStudentsByVietnameseName(students).map(
        (student) => student.canonical.studentCode,
      ),
    ).toEqual(["MS001", "MS002", "MS003", "MS004"]);
  });
});
