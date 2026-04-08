import type {
  AllocationOutputRow,
  EditableAllocationRun,
} from "../domain/allocation-types";

export function projectOutputRecords(
  run: Pick<EditableAllocationRun, "rooms">,
): AllocationOutputRow[] {
  return [...run.rooms]
    .sort((left, right) => left.roomNumber - right.roomNumber)
    .flatMap((room) =>
      [...room.students]
        .sort((left, right) => left.seatIndex - right.seatIndex)
        .map((student) => ({
          roomLabel: `Phòng ${room.roomNumber}`,
          roomNumber: room.roomNumber,
          candidateNumber: student.candidateNumber,
          seatIndex: student.seatIndex,
          className: student.canonical.className,
          studentCode: student.canonical.studentCode,
          middleName: student.canonical.middleName,
          firstName: student.canonical.firstName,
          fullName: student.canonical.fullName,
          birthDateIso: student.canonical.birthDateIso,
          birthPlace: student.canonical.birthPlace,
          note: student.canonical.note ?? null,
        })),
    );
}
