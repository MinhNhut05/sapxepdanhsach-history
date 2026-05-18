import type { AllocationOutputRow } from "../domain/allocation-types";

export const TEMPLATE_VERSION = "phase-06-plan-03-v1";
export const ROOM_ONLY_EXPORT_MODES = {
  roomTemplate: "room_template",
  fallback: "full_template_single_room_fallback",
} as const;

export type ExportMode = "full_workbook" | (typeof ROOM_ONLY_EXPORT_MODES)[keyof typeof ROOM_ONLY_EXPORT_MODES];

export interface TemplateMetadataEntry {
  label: string;
  value: string | number;
}

export interface TemplateColumnContract {
  header: string;
  key:
    | "ordinal"
    | keyof Pick<
        AllocationOutputRow,
        | "candidateNumber"
        | "middleName"
        | "firstName"
        | "birthDateIso"
        | "className"
        | "studentCode"
        | "birthPlace"
        | "roomLabel"
        | "seatIndex"
        | "fullName"
        | "note"
      >;
  width: number;
  horizontal: "left" | "center";
}

export interface SheetTemplateContract {
  totalColumns: number;
  titleRowNumber: number;
  subtitleRowNumber: number;
  metadataRowNumber: number;
  headerRowNumber: number;
  dataRowStartNumber: number;
  spacerRowNumber: number;
  columns: readonly TemplateColumnContract[];
  titleFill: string;
  subtitleFill: string;
  headerFill: string;
  metadataFill: string;
  borderColor: string;
  titleTextColor: string;
  subtitleTextColor: string;
  bodyTextColor: string;
  pageSetup: {
    orientation: "landscape" | "portrait";
    fitToPage: boolean;
    fitToWidth: number;
    fitToHeight: number;
    paperSize: number;
    margins: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      header: number;
      footer: number;
    };
  };
  metadataSlots: ReadonlyArray<readonly [number, number]>;
}

export const ALLOCATION_TEMPLATE_COLUMNS = [
  { header: "STT", key: "ordinal", width: 8, horizontal: "center" },
  { header: "SBD", key: "candidateNumber", width: 16, horizontal: "center" },
  { header: "HỌ LÓT", key: "middleName", width: 22, horizontal: "left" },
  { header: "TÊN", key: "firstName", width: 18, horizontal: "left" },
  { header: "NGÀY SINH", key: "birthDateIso", width: 14, horizontal: "center" },
  { header: "LỚP", key: "className", width: 14, horizontal: "center" },
  { header: "MSHV", key: "studentCode", width: 16, horizontal: "center" },
  { header: "NƠI SINH", key: "birthPlace", width: 18, horizontal: "left" },
  { header: "PHÒNG THI", key: "roomLabel", width: 14, horizontal: "center" },
  { header: "THỨ TỰ", key: "seatIndex", width: 10, horizontal: "center" },
  { header: "HỌ VÀ TÊN", key: "fullName", width: 28, horizontal: "left" },
  { header: "GHI CHÚ", key: "note", width: 20, horizontal: "left" },
] as const satisfies readonly TemplateColumnContract[];

export const SHEET_TEMPLATE_CONTRACT: SheetTemplateContract = {
  totalColumns: ALLOCATION_TEMPLATE_COLUMNS.length,
  titleRowNumber: 1,
  subtitleRowNumber: 2,
  metadataRowNumber: 3,
  spacerRowNumber: 4,
  headerRowNumber: 5,
  dataRowStartNumber: 6,
  columns: ALLOCATION_TEMPLATE_COLUMNS,
  titleFill: "E6D0B2",
  subtitleFill: "F4EADD",
  headerFill: "F0DDC2",
  metadataFill: "FBF6EF",
  borderColor: "CDB99C",
  titleTextColor: "4A3112",
  subtitleTextColor: "6B5433",
  bodyTextColor: "2D2318",
  pageSetup: {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    },
  },
  metadataSlots: [
    [1, 2],
    [4, 5],
    [7, 8],
  ],
};

export function resolveRoomOnlyExportMode(): (typeof ROOM_ONLY_EXPORT_MODES)[keyof typeof ROOM_ONLY_EXPORT_MODES] {
  return ROOM_ONLY_EXPORT_MODES.fallback;
}
