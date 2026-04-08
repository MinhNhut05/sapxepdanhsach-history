export type RawBirthDateValue = Date | number | string | null;

export interface RawStudentFieldValues {
  className: string;
  studentCode: string;
  middleName: string;
  firstName: string;
  birthDate: RawBirthDateValue;
  birthPlace: string;
  note?: string | null;
}

export interface RawStudentRecord {
  rowIndex: number;
  original: RawStudentFieldValues;
}

export interface CanonicalStudentFieldValues {
  className: string;
  studentCode: string;
  middleName: string;
  firstName: string;
  fullName: string;
  birthDateIso: string;
  birthPlace: string;
  note?: string | null;
}

export interface CanonicalStudentRecord {
  rowIndex: number;
  raw: RawStudentFieldValues;
  canonical: CanonicalStudentFieldValues;
  birthDateIso: string;
}
