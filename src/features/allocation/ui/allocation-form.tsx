"use client";

import type { AllocationStrategyKey } from "../domain/allocation-types";

const strategyOptions: Array<{
  value: AllocationStrategyKey;
  label: string;
  description: string;
}> = [
  {
    value: "even_mix",
    label: "Trộn đều",
    description: "Phân học viên theo vòng lặp đều giữa các phòng.",
  },
  {
    value: "class_grouped",
    label: "Gom theo lớp",
    description: "Giữ từng lớp liền mạch qua ít phòng nhất có thể.",
  },
  {
    value: "representative_ratio",
    label: "Tỷ lệ đại diện",
    description: "Mỗi phòng giữ tỷ lệ lớp gần với toàn bộ roster.",
  },
];

interface AllocationFormProps {
  disabled: boolean;
  isSubmitting: boolean;
  maxRoomCount: number;
  roomCount: number;
  strategy: AllocationStrategyKey;
  onRoomCountChange: (value: number) => void;
  onStrategyChange: (value: AllocationStrategyKey) => void;
  onSubmit: () => void;
}

export function AllocationForm({
  disabled,
  isSubmitting,
  maxRoomCount,
  roomCount,
  strategy,
  onRoomCountChange,
  onStrategyChange,
  onSubmit,
}: AllocationFormProps) {
  return (
    <section className="panel-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Thiết lập phân phòng</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Chọn số phòng và chiến lược
          </h2>
        </div>
        <span
          className={`status-badge ${
            disabled ? "status-badge--neutral" : "status-badge--success"
          }`}
        >
          {disabled ? "Chờ import hợp lệ" : "Sẵn sàng chạy"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.72fr_1fr]">
        <label className="soft-panel">
          <p className="field-label">Số phòng thi</p>
          <input
            min={1}
            max={maxRoomCount}
            step={1}
            value={roomCount}
            onChange={(event) => onRoomCountChange(Number(event.target.value))}
            type="number"
            className="mt-3 w-full rounded-2xl border border-[var(--border-soft)] bg-white/90 px-4 py-3 text-base font-semibold text-[var(--text-primary)]"
            disabled={disabled || isSubmitting}
          />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Giới hạn hiện tại: 1..{maxRoomCount}, chỉ nhận số nguyên
          </p>
        </label>

        <div className="grid gap-3">
          {strategyOptions.map((option) => (
            <label
              key={option.value}
              className="soft-panel flex cursor-pointer items-start gap-3"
            >
              <input
                checked={strategy === option.value}
                name="allocation-strategy"
                onChange={() => onStrategyChange(option.value)}
                type="radio"
                value={option.value}
                disabled={disabled || isSubmitting}
                className="mt-1 h-4 w-4"
              />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {option.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || isSubmitting}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang chạy phân phòng..." : "Chạy phân phòng"}
      </button>
    </section>
  );
}
