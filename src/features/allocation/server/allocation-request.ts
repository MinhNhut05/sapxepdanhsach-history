import { z } from "zod";

export const MAX_ALLOCATION_STUDENTS = 5000;

export const allocationStrategySchema = z.enum([
  "even_mix",
  "class_grouped",
  "representative_ratio",
]);

const canonicalStudentSchema = z.object({
  rowIndex: z.number().int().positive(),
  raw: z.object({
    className: z.string().min(1),
    studentCode: z.string().min(1),
    middleName: z.string().min(1),
    firstName: z.string().min(1),
    birthDate: z.union([z.string(), z.number(), z.date(), z.null()]),
    birthPlace: z.string().min(1),
    note: z.string().nullable().optional(),
  }),
  canonical: z.object({
    className: z.string().min(1),
    studentCode: z.string().min(1),
    middleName: z.string().min(1),
    firstName: z.string().min(1),
    fullName: z.string().min(1),
    birthDateIso: z.string().min(1),
    birthPlace: z.string().min(1),
    note: z.string().nullable().optional(),
  }),
  birthDateIso: z.string().min(1),
});

export const allocationRequestSchema = z.object({
  sourceFileName: z.string().min(1),
  sourceSheetName: z.string().min(1).nullable().optional(),
  roomCount: z.number().int().min(1).max(99),
  strategy: allocationStrategySchema,
  students: z.array(canonicalStudentSchema).min(1).max(MAX_ALLOCATION_STUDENTS),
});

export type AllocationRequestInput = z.infer<typeof allocationRequestSchema>;
