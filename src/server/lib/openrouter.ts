import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModelV3 } from "@openrouter/ai-sdk-provider";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";

// This fork runs AI features on DeepSeek instead of OpenRouter. The internal
// "openrouter" names (key slot, OPENROUTER_* env vars, this module) are kept
// so upstream syncs stay mergeable; the key they hold is a DeepSeek key.
// Override the model with OPENROUTER_MODEL (e.g. "deepseek-flash").
const DEFAULT_CHAT_AGENT_MODEL = "deepseek-v4-pro";

/**
 * Returns the AI SDK LanguageModel for the chat agent and the research
 * features. "max" runs DeepSeek's thinking mode at its highest effort; "low"
 * (compaction, relevance filtering) turns thinking off for speed and cost.
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
  return wrapLanguageModel({
    model: deepseek(modelId || DEFAULT_CHAT_AGENT_MODEL),
    middleware: defaultSettingsMiddleware({
      settings: {
        providerOptions: {
          deepseek:
            reasoningEffort === "low"
              ? { thinking: { type: "disabled" } }
              : { thinking: { type: "enabled" }, reasoningEffort: "max" },
        },
      },
    }),
  });
}
