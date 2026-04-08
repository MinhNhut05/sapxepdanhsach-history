import type { AllocationRetentionPolicy } from "../domain/allocation-types";

const DEFAULT_ALLOCATION_RUN_RETENTION_DAYS = 30;

function parseRetentionDays(input: string | undefined): number {
  const parsed = Number(input);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_ALLOCATION_RUN_RETENTION_DAYS;
  }

  return parsed;
}

export const ALLOCATION_RUN_RETENTION_DAYS = parseRetentionDays(
  process.env.ALLOCATION_RUN_RETENTION_DAYS,
);

interface AllocationRetentionRecord {
  id: string;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  lastEditedAt?: Date | string | null;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function getAllocationRetentionPolicy(): AllocationRetentionPolicy {
  return {
    days: ALLOCATION_RUN_RETENTION_DAYS,
    basis: "last_activity",
  };
}

export function getAllocationRunLastActivityAt(
  record: AllocationRetentionRecord,
): Date {
  return asDate(record.lastEditedAt ?? record.updatedAt ?? record.createdAt);
}

export function isAllocationRunExpired(
  record: AllocationRetentionRecord,
  now = new Date(),
): boolean {
  const lastActivityAt = getAllocationRunLastActivityAt(record);
  const retentionWindowMs = ALLOCATION_RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  return now.getTime() - lastActivityAt.getTime() >= retentionWindowMs;
}

export async function pruneExpiredAllocationRuns<T extends AllocationRetentionRecord>(
  records: T[],
  removeExpired?: (ids: string[]) => Promise<void>,
  now = new Date(),
): Promise<T[]> {
  const expiredIds = records
    .filter((record) => isAllocationRunExpired(record, now))
    .map((record) => record.id);

  if (expiredIds.length > 0 && removeExpired) {
    await removeExpired(expiredIds);
  }

  return records.filter((record) => !expiredIds.includes(record.id));
}
