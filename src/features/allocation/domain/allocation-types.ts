import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";

export type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";

export type AllocationStrategyKey =
  | "even_mix"
  | "class_grouped"
  | "representative_ratio";

export interface RoomCapacity {
  roomNumber: number;
  capacity: number;
}

export interface AllocationRunInput {
  students: CanonicalStudentRecord[];
  roomCount: number;
  strategy: AllocationStrategyKey;
}

export interface AllocationRequestPayload extends AllocationRunInput {
  sourceFileName: string;
  sourceSheetName?: string | null;
}

export interface AllocationRoomDraft {
  roomNumber: number;
  capacity: number;
  students: CanonicalStudentRecord[];
}

export interface AllocatedStudent extends CanonicalStudentRecord {
  roomNumber: number;
  seatIndex: number;
  candidateNumber: string;
}

export interface AllocationRoomResult {
  roomNumber: number;
  capacity: number;
  students: AllocatedStudent[];
}

export interface AllocationRunSummary {
  totalStudents: number;
  roomCount: number;
  maxRoomSize: number;
  minRoomSize: number;
  sizeSpread: number;
}

export type AllocationWarningSeverity = "blocking" | "warning";

export interface AllocationWarning {
  severity: AllocationWarningSeverity;
  code: string;
  message: string;
  roomNumber?: number;
  studentKey?: string;
}

export interface RoomSizeBucket {
  size: number;
  roomCount: number;
  roomNumbers: number[];
}

export interface RoomClassCount {
  className: string;
  count: number;
  percentageOfRoom: number;
  percentageOfClass: number;
}

export interface RoomClassBreakdown {
  roomNumber: number;
  studentCount: number;
  dominantClassName: string | null;
  dominantClassPercentage: number;
  classes: RoomClassCount[];
}

export interface ClassDistributionRoomMetric {
  roomNumber: number;
  count: number;
  percentageOfClass: number;
  percentageOfRoom: number;
}

export interface ClassDistributionMetric {
  className: string;
  totalStudents: number;
  roomCoverage: number;
  dominantRoomNumber: number | null;
  dominantRoomSharePercent: number;
  rooms: ClassDistributionRoomMetric[];
}

export interface ClassSpreadRoomMetric {
  roomNumber: number;
  count: number;
}

export interface ClassSpreadMetric {
  className: string;
  totalStudents: number;
  expectedMinPerRoom: number;
  expectedMaxPerRoom: number;
  minCount: number;
  maxCount: number;
  spread: number;
  rooms: ClassSpreadRoomMetric[];
}

export interface ClassSpreadViolation {
  className: string;
  code: string;
  message: string;
  expectedMinPerRoom: number;
  expectedMaxPerRoom: number;
  actualMinCount: number;
  actualMaxCount: number;
  spread: number;
}

export interface FairnessFeasibility {
  strategy: AllocationStrategyKey;
  strictClassSpreadTarget: number | null;
  feasible: boolean;
  fallbackApplied: boolean;
  reasonCode: string | null;
  reason: string | null;
}

export interface AllocationValidationResult {
  classSpreadByClass: ClassSpreadMetric[];
  classSpreadViolations: ClassSpreadViolation[];
  fairnessFeasibility: FairnessFeasibility | null;
}

export interface ReviewSummary extends AllocationRunSummary {
  roomSizeBuckets: RoomSizeBucket[];
  roomClassBreakdown: RoomClassBreakdown[];
  classDistribution: ClassDistributionMetric[];
  classSpreadByClass: ClassSpreadMetric[];
  classSpreadViolations: ClassSpreadViolation[];
  fairnessFeasibility: FairnessFeasibility | null;
  warnings: AllocationWarning[];
}

export interface AllocationResultSnapshot {
  strategy: AllocationStrategyKey;
  roomCapacities: RoomCapacity[];
  rooms: AllocationRoomResult[];
  summary: ReviewSummary;
}

export interface AllocationInputSnapshot extends AllocationRequestPayload {
  sourceSheetName: string | null;
}

export interface PreparedAllocationRun extends AllocationRequestPayload {
  sourceSheetName: string | null;
  totalStudents: number;
  algorithmVersion: string;
  rosterFingerprint: string;
  inputSnapshot: AllocationInputSnapshot;
  resultSnapshot: AllocationResultSnapshot;
  summary: ReviewSummary;
}

export interface ManualEditRoomPayload {
  roomNumber: number;
  studentKeys: string[];
}

export interface SaveManualEditsPayload {
  expectedEditVersion: number;
  rooms: ManualEditRoomPayload[];
}

export interface SavedAllocationRun {
  id: string;
  createdAt: string;
  sourceFileName: string;
  sourceSheetName: string | null;
  strategy: AllocationStrategyKey;
  roomCount: number;
  summary: ReviewSummary | AllocationRunSummary;
  rooms: AllocationRoomResult[];
  editVersion?: number;
  lastEditedAt?: string | null;
  isEdited?: boolean;
  originalSummary?: ReviewSummary | AllocationRunSummary;
  originalRooms?: AllocationRoomResult[];
}

export interface AllocationOutputRow {
  roomLabel: string;
  roomNumber: number;
  candidateNumber: string;
  seatIndex: number;
  className: string;
  studentCode: string;
  middleName: string;
  firstName: string;
  fullName: string;
  birthDateIso: string;
  birthPlace: string;
  note: string | null;
}

export interface AllocationHistoryItem {
  id: string;
  sourceFileName: string;
  createdAt: string;
  lastEditedAt: string | null;
  strategy: AllocationStrategyKey;
  roomCount: number;
  totalStudents: number;
  isEdited: boolean;
}

export interface AllocationRetentionPolicy {
  days: number;
  basis: "last_activity";
}

export interface AllocationHistoryResponse {
  retention: AllocationRetentionPolicy;
  runs: AllocationHistoryItem[];
}

export interface EditableAllocationRun
  extends Omit<
    SavedAllocationRun,
    | "summary"
    | "editVersion"
    | "lastEditedAt"
    | "isEdited"
    | "originalSummary"
    | "originalRooms"
  > {
  summary: ReviewSummary;
  editVersion: number;
  lastEditedAt: string | null;
  isEdited: boolean;
  originalSummary: ReviewSummary;
  originalRooms: AllocationRoomResult[];
}
