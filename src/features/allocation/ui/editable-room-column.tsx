"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getManualEditStudentKey } from "../domain/project-manual-edits";
import type { AllocationRoomResult } from "../domain/allocation-types";

interface EditableRoomColumnProps {
  room: AllocationRoomResult;
  totalRooms: number;
  onMoveStudent: (studentKey: string, toRoomNumber: number, toIndex?: number) => void;
}

interface SortableStudentCardProps {
  roomNumber: number;
  totalRooms: number;
  student: AllocationRoomResult["students"][number];
  studentCount: number;
  onMoveStudent: (studentKey: string, toRoomNumber: number, toIndex?: number) => void;
}

function SortableStudentCard({
  roomNumber,
  totalRooms,
  student,
  studentCount,
  onMoveStudent,
}: SortableStudentCardProps) {
  const studentKey = getManualEditStudentKey(student);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: studentKey,
    data: {
      type: "student",
      roomNumber,
      studentKey,
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-[var(--border-soft)] bg-white/90 p-3 shadow-[0_8px_24px_rgba(78,61,40,0.05)] ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {student.candidateNumber}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {student.canonical.fullName}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {student.canonical.className} · {student.canonical.studentCode}
          </p>
        </div>
        <button
          type="button"
          aria-label={`drag ${student.canonical.studentCode}`}
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
          {...attributes}
          {...listeners}
        >
          drag
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-label={`move up ${student.canonical.studentCode}`}
          onClick={() => onMoveStudent(studentKey, roomNumber, student.seatIndex - 2)}
          disabled={student.seatIndex === 1}
          className="rounded-xl border border-[var(--border-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
        >
          move up
        </button>
        <button
          type="button"
          aria-label={`move down ${student.canonical.studentCode}`}
          onClick={() => onMoveStudent(studentKey, roomNumber, student.seatIndex)}
          disabled={student.seatIndex === studentCount}
          className="rounded-xl border border-[var(--border-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
        >
          move down
        </button>
        <button
          type="button"
          aria-label={`move to previous room ${student.canonical.studentCode}`}
          onClick={() => onMoveStudent(studentKey, roomNumber - 1)}
          disabled={roomNumber === 1}
          className="rounded-xl border border-[var(--border-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
        >
          move to previous room
        </button>
        <button
          type="button"
          aria-label={`move to next room ${student.canonical.studentCode}`}
          onClick={() => onMoveStudent(studentKey, roomNumber + 1)}
          disabled={roomNumber === totalRooms}
          className="rounded-xl border border-[var(--border-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
        >
          move to next room
        </button>
      </div>
    </article>
  );
}

export function EditableRoomColumn({
  room,
  totalRooms,
  onMoveStudent,
}: EditableRoomColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `room-${room.roomNumber}`,
    data: {
      type: "room",
      roomNumber: room.roomNumber,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`soft-panel min-h-[18rem] ${
        isOver ? "ring-2 ring-[var(--accent-strong)]" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Editable room</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            P{String(room.roomNumber).padStart(2, "0")}
          </h3>
        </div>
        <span className="status-badge status-badge--neutral">
          {room.students.length}/{room.capacity} seats
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {room.students.map((student) => (
          <SortableStudentCard
            key={getManualEditStudentKey(student)}
            roomNumber={room.roomNumber}
            totalRooms={totalRooms}
            student={student}
            studentCount={room.students.length}
            onMoveStudent={onMoveStudent}
          />
        ))}
      </div>
    </section>
  );
}
