import type { IntakeConfidenceBand } from "@/features/roster/domain/intake-review";
import type { CanonicalStudentRecord } from "@/features/roster/domain/student-record";
import type { ImportIssue } from "@/features/roster/domain/import-issue";
import type { IntakeSourceFormat } from "@/features/roster/ui/import-state";

import type { SmartIntakeConfig } from "./intake-config";
import type { RepairProposal } from "./row-validation";

export interface IntakeAiHeaderMappingSuggestion {
  fieldKey: RepairProposal["fieldKey"];
  label: string;
  rawValue: string | null;
  proposedValue: string | null;
  confidence: IntakeConfidenceBand;
  reasoning: string;
}

export interface IntakeAiRepairSuggestion {
  fieldKey: RepairProposal["fieldKey"];
  label: string;
  rawValue: string | null;
  proposedValue: string | null;
  confidence: IntakeConfidenceBand;
  reasoning: string;
  sensitive?: boolean;
}

export interface IntakeAiProvider {
  suggestHeaderMapping(input: {
    sourceFormat: IntakeSourceFormat;
    headerValues: string[];
    issues: ImportIssue[];
  }): Promise<IntakeAiHeaderMappingSuggestion[]>;
  suggestRepairs(input: {
    sourceFormat: IntakeSourceFormat;
    students: CanonicalStudentRecord[];
    issues: ImportIssue[];
    repairs: RepairProposal[];
  }): Promise<IntakeAiRepairSuggestion[]>;
}

class OpenAiCompatibleIntakeProvider implements IntakeAiProvider {
  constructor(private readonly config: SmartIntakeConfig) {}

  async suggestHeaderMapping(): Promise<IntakeAiHeaderMappingSuggestion[]> {
    return [];
  }

  async suggestRepairs(input: {
    sourceFormat: IntakeSourceFormat;
    students: CanonicalStudentRecord[];
    issues: ImportIssue[];
    repairs: RepairProposal[];
  }): Promise<IntakeAiRepairSuggestion[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(new URL("/chat/completions", this.config.baseUrl ?? undefined), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.reasoningModel ?? this.config.fastModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Return JSON with a suggestions array. Only propose safe roster intake repairs and include reasoning.",
            },
            {
              role: "user",
              content: JSON.stringify({
                sourceFormat: input.sourceFormat,
                students: input.students.slice(0, 20),
                issues: input.issues,
                repairs: input.repairs,
              }),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(`Smart Intake provider failed with status ${response.status}`) as Error & {
          status?: number;
        };
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

      const parsed = JSON.parse(content) as {
        suggestions?: IntakeAiRepairSuggestion[];
      };

      return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createIntakeAiProvider(config: SmartIntakeConfig): IntakeAiProvider | null {
  if (!config.enabled) {
    return null;
  }

  return new OpenAiCompatibleIntakeProvider(config);
}
