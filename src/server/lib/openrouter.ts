import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModelV3 } from "@openrouter/ai-sdk-provider";
import {
  defaultSettingsMiddleware,
  wrapLanguageModel,
  type LanguageModelMiddleware,
} from "ai";

// This fork runs AI features on DeepSeek instead of OpenRouter. The internal
// "openrouter" names (key slot, OPENROUTER_* env vars, this module) are kept
// so upstream syncs stay mergeable; the key they hold is a DeepSeek key.
// OPENROUTER_MODEL overrides the model for every call.
const DEFAULT_CHAT_AGENT_MODEL = "deepseek-v4-pro";
// Low-effort calls (research, prompt suggestions, compaction) run on Flash:
// Pro without thinking still took past their 60-120s deadlines.
const DEFAULT_LOW_EFFORT_MODEL = "deepseek-flash";

/**
 * Returns the AI SDK LanguageModel for the chat agent and the research
 * features. "max" runs DeepSeek's thinking mode at its highest effort; "low"
 * turns thinking off for speed and cost.
 *
 * Sync on purpose: Think's `getModel()` hook is sync and runs on every turn,
 * so the SAM agent reads the key/model from its DO env and builds here.
 */
export function buildChatAgentModel(
  apiKey: string,
  modelId?: string,
  reasoningEffort: "max" | "low" = "max",
): LanguageModelV3 {
  const deepseek = createDeepSeek({ apiKey });
  const lowEffort = reasoningEffort === "low";
  return wrapLanguageModel({
    model: deepseek(
      modelId ||
        (lowEffort ? DEFAULT_LOW_EFFORT_MODEL : DEFAULT_CHAT_AGENT_MODEL),
    ),
    middleware: [
      defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            deepseek: lowEffort
              ? { thinking: { type: "disabled" } }
              : { thinking: { type: "enabled" }, reasoningEffort: "max" },
          },
        },
      }),
      jsonOutputWithTools,
    ],
  });
}

// DeepSeek has no JSON-schema mode, only `json_object`, and in that mode it
// answers with JSON straight away instead of calling tools. Structured output
// with tools (website research) then skips its required search. For those
// calls, ask for the JSON in the prompt and leave the model free to call
// tools first.
const jsonOutputWithTools: LanguageModelMiddleware = {
  specificationVersion: "v3",
  transformParams: async ({ params }) => {
    const { responseFormat, tools, prompt } = params;
    if (responseFormat?.type !== "json" || !tools?.length) return params;
    return {
      ...params,
      responseFormat: undefined,
      prompt: [
        {
          role: "system",
          content: `Call the tools you need first. Then reply with only a JSON object, without code fences, that conforms to this schema: ${JSON.stringify(responseFormat.schema)}`,
        },
        ...prompt,
      ],
    };
  },
};
