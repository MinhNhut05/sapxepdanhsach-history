import { z } from "zod";

export const exportAiAdvisorySchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["info", "warning"]),
  message: z.string().min(1),
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export const exportAiResponseSchema = z.object({
  advisories: z.array(exportAiAdvisorySchema).default([]),
});

export type ExportAiAdvisory = z.infer<typeof exportAiAdvisorySchema>;

export interface ExportAiVerifierInput {
  runId: string;
  deterministicSummary: {
    status: "pass" | "fail";
    blockers: Array<{
      code: string;
      message: string;
      section: string;
      reasoning: string;
    }>;
    warnings: Array<{
      code: string;
      message: string;
      section: string;
      reasoning: string;
    }>;
  };
}

export interface ExportAiConfig {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  timeoutMs: number;
}

function getExportAiConfig(): ExportAiConfig {
  return {
    enabled: process.env.EXPORT_VERIFICATION_AI_ENABLED === "true",
    baseUrl: process.env.EXPORT_VERIFICATION_AI_BASE_URL ?? null,
    apiKey: process.env.EXPORT_VERIFICATION_AI_API_KEY ?? null,
    model: process.env.EXPORT_VERIFICATION_AI_MODEL ?? null,
    timeoutMs: Number(process.env.EXPORT_VERIFICATION_AI_TIMEOUT_MS ?? 8000),
  };
}

class OpenAiCompatibleExportVerifier {
  constructor(private readonly config: ExportAiConfig) {}

  async verify(input: ExportAiVerifierInput): Promise<ExportAiAdvisory[]> {
    if (!this.config.baseUrl || !this.config.apiKey || !this.config.model) {
      throw new Error("Export verification AI config missing base url, api key, or model.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(new URL("/chat/completions", this.config.baseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Return JSON with an advisories array. Advisories are additive only and must never claim deterministic blockers are resolved.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(
          `Export verification provider failed with status ${response.status}`,
        ) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        return [];
      }

      const parsed = exportAiResponseSchema.parse(JSON.parse(content));
      return parsed.advisories;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function verifyWithAi(
  input: ExportAiVerifierInput,
): Promise<ExportAiAdvisory[]> {
  const config = getExportAiConfig();

  if (!config.enabled) {
    throw new Error("Export verification AI config disabled.");
  }

  const verifier = new OpenAiCompatibleExportVerifier(config);
  return verifier.verify(input);
}
