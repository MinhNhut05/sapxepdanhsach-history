export interface IntakeAiFailureResult {
  fallbackUsed: true;
  reason: "config" | "timeout" | "quota" | "provider";
  message: string;
}

export function handleIntakeAiFailure(error: unknown): IntakeAiFailureResult {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;
  const message = error instanceof Error ? error.message : "Smart Intake AI provider failed.";
  const normalized = message.toLowerCase();

  if (normalized.includes("abort") || normalized.includes("timeout")) {
    return {
      fallbackUsed: true,
      reason: "timeout",
      message: "Smart Intake AI bị timeout nên hệ thống chuyển sang review theo rule.",
    };
  }

  if (status === 429 || normalized.includes("quota") || normalized.includes("rate limit")) {
    return {
      fallbackUsed: true,
      reason: "quota",
      message: "Smart Intake AI hết quota nên hệ thống chuyển sang review theo rule.",
    };
  }

  if (normalized.includes("config") || normalized.includes("base url") || normalized.includes("api key")) {
    return {
      fallbackUsed: true,
      reason: "config",
      message: "Smart Intake AI chưa được cấu hình đầy đủ nên hệ thống dùng rule-based review.",
    };
  }

  return {
    fallbackUsed: true,
    reason: "provider",
    message: "Smart Intake AI tạm thời không khả dụng nên hệ thống dùng rule-based review.",
  };
}
