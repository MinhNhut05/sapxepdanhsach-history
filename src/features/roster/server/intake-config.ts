import { z } from "zod";

const smartIntakeConfigSchema = z.object({
  provider: z.string().trim().min(1).nullable(),
  baseUrl: z.string().trim().url().nullable(),
  apiKey: z.string().trim().min(1).nullable(),
  fastModel: z.string().trim().min(1).nullable(),
  reasoningModel: z.string().trim().min(1).nullable(),
  timeoutMs: z.coerce.number().int().positive().default(8000),
});

export interface SmartIntakeConfig {
  enabled: boolean;
  provider: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  fastModel: string | null;
  reasoningModel: string | null;
  timeoutMs: number;
}

function toNullableString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getSmartIntakeConfig(env: NodeJS.ProcessEnv = process.env): SmartIntakeConfig {
  const parsed = smartIntakeConfigSchema.parse({
    provider: toNullableString(env.SMART_INTAKE_AI_PROVIDER),
    baseUrl: toNullableString(env.SMART_INTAKE_AI_BASE_URL),
    apiKey: toNullableString(env.SMART_INTAKE_AI_API_KEY),
    fastModel: toNullableString(env.SMART_INTAKE_AI_FAST_MODEL),
    reasoningModel: toNullableString(env.SMART_INTAKE_AI_REASONING_MODEL),
    timeoutMs: env.SMART_INTAKE_AI_TIMEOUT_MS ?? 8000,
  });

  const enabled = Boolean(parsed.provider && parsed.baseUrl && parsed.apiKey);

  return {
    enabled,
    provider: parsed.provider,
    baseUrl: parsed.baseUrl,
    apiKey: parsed.apiKey,
    fastModel: parsed.fastModel,
    reasoningModel: parsed.reasoningModel,
    timeoutMs: parsed.timeoutMs,
  };
}
