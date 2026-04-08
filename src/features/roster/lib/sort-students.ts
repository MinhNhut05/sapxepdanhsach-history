import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";

import { vietnameseCollator } from "./normalize-vietnamese";

export function compareStudentsByVietnameseName(
  left: CanonicalStudentRecord,
  right: CanonicalStudentRecord,
): number {
  const firstNameComparison = vietnameseCollator.compare(
    left.canonical.firstName,
    right.canonical.firstName,
  );

  if (firstNameComparison !== 0) {
    return firstNameComparison;
  }

  const middleNameComparison = vietnameseCollator.compare(
    left.canonical.middleName,
    right.canonical.middleName,
  );

  if (middleNameComparison !== 0) {
    return middleNameComparison;
  }

  const studentCodeComparison = vietnameseCollator.compare(
    left.canonical.studentCode,
    right.canonical.studentCode,
  );

  if (studentCodeComparison !== 0) {
    return studentCodeComparison;
  }

  return left.rowIndex - right.rowIndex;
}

export function sortStudentsByVietnameseName(
  students: CanonicalStudentRecord[],
): CanonicalStudentRecord[] {
  return [...students].sort(compareStudentsByVietnameseName);
}
