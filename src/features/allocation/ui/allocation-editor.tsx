"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { AllocationRoomResult, AllocationWarning } from "../domain/allocation-types";
import { getManualEditStudentKey } from "../domain/project-manual-edits";
import { EditableRoomColumn } from "./editable-room-column";

interface AllocationEditorProps {
  rooms: AllocationRoomResult[];
  dirty: boolean;
  blockingIssues: AllocationWarning[];
  warningIssues: AllocationWarning[];
  onMoveStudent: (studentKey: string, toRoomNumber: number, toIndex?: number) => void;
  onReorderStudent: (roomNumber: number, studentKey: string, toIndex: number) => void;
}

export function AllocationEditor({
  rooms,
  dirty,
  blockingIssues,
  warningIssues,
  onMoveStudent,
  onReorderStudent,
}: AllocationEditorProps) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const studentKey = String(active.id);
    const sourceRoom = rooms.find((room) =>
      room.students.some(
        (student) => getManualEditStudentKey(student) === studentKey,
      ),
    );

    if (!sourceRoom) {
      return;
    }

    const overData = over.data.current as
      | { type: "student"; roomNumber: number; studentKey: string }
      | { type: "room"; roomNumber: number }
      | undefined;

    if (!overData) {
      return;
    }

    if (overData.type === "room") {
      onMoveStudent(studentKey, overData.roomNumber);
      return;
    }

    const targetRoom = rooms.find((room) => room.roomNumber === overData.roomNumber);

    if (!targetRoom) {
      return;
    }

    const targetIndex = targetRoom.students.findIndex(
      (student) => getManualEditStudentKey(student) === overData.studentKey,
    );

    if (targetIndex < 0) {
      return;
    }

    if (sourceRoom.roomNumber === targetRoom.roomNumber) {
      onReorderStudent(targetRoom.roomNumber, studentKey, targetIndex);
      return;
    }

    onMoveStudent(studentKey, targetRoom.roomNumber, targetIndex);
  }

  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Draft editor</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            DndContext và explicit move controls
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`status-badge ${
              dirty ? "status-badge--warning" : "status-badge--success"
            }`}
          >
            {dirty ? "Draft changed" : "Draft synced"}
          </span>
          <span className="status-badge status-badge--danger">
            blocking {blockingIssues.length}
          </span>
          <span className="status-badge status-badge--warning">
            warning {warningIssues.length}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        Dùng drag-and-drop hoặc các nút move up / move down / move to next room để đổi thứ tự và di chuyển học viên giữa các phòng.
      </p>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {rooms.map((room) => (
            <SortableContext
              key={room.roomNumber}
              items={room.students.map((student) => getManualEditStudentKey(student))}
              strategy={verticalListSortingStrategy}
            >
              <EditableRoomColumn
                room={room}
                totalRooms={rooms.length}
                onMoveStudent={onMoveStudent}
              />
            </SortableContext>
          ))}
        </div>
      </DndContext>
    </section>
  );
}
