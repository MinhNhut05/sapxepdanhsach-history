export interface ExportAiFallbackResult {
  fallbackUsed: true;
  reason: "config" | "timeout" | "quota" | "provider";
  message: string;
}

export function handleExportAiFailure(error: unknown): ExportAiFallbackResult {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;
  const message = error instanceof Error ? error.message : "Export verification AI provider failed.";
  const normalized = message.toLowerCase();

  if (normalized.includes("abort") || normalized.includes("timeout")) {
    return {
      fallbackUsed: true,
      reason: "timeout",
      message: "AI verification bị timeout nên hệ thống chỉ dùng deterministic checks.",
    };
  }

  if (status === 429 || normalized.includes("quota") || normalized.includes("rate limit")) {
    return {
      fallbackUsed: true,
      reason: "quota",
      message: "AI verification hết quota nên hệ thống chỉ dùng deterministic checks.",
    };
  }

  if (
    normalized.includes("config") ||
    normalized.includes("base url") ||
    normalized.includes("api key") ||
    normalized.includes("disabled")
  ) {
    return {
      fallbackUsed: true,
      reason: "config",
      message: "AI verification chưa được cấu hình đầy đủ nên hệ thống chỉ dùng deterministic checks.",
    };
  }

  return {
    fallbackUsed: true,
    reason: "provider",
    message: "AI verification tạm thời không khả dụng nên hệ thống chỉ dùng deterministic checks.",
  };
}
