import { generateText, Output, tool } from "ai";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { buildChatAgentModel } from "./openrouter";

const requestSchema = z.object({
  model: z.string(),
  thinking: z.object({ type: z.string() }),
  reasoning_effort: z.string().optional(),
  response_format: z.object({ type: z.string() }).optional(),
});

const output = Output.object({ schema: z.object({ ok: z.boolean() }) });
const tools = {
  search: tool({ inputSchema: z.object({}), execute: async () => "" }),
};

async function requestBody({
  reasoningEffort,
  withOutput = false,
  withTools = false,
}: {
  reasoningEffort?: "max" | "low";
  withOutput?: boolean;
  withTools?: boolean;
} = {}) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    Response.json({
      choices: [
        {
          message: { role: "assistant", content: '{"ok":true}' },
          finish_reason: "stop",
        },
      ],
    }),
  );
  await generateText({
    model: buildChatAgentModel("key", undefined, reasoningEffort),
    prompt: "hi",
    ...(withOutput && { output }),
    ...(withTools && { tools }),
  });
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.deepseek.com/chat/completions",
    expect.anything(),
  );
  return requestSchema.parse(
    JSON.parse(z.string().parse(fetchMock.mock.lastCall?.[1]?.body)),
  );
}

it("calls DeepSeek V4 Pro with thinking at max effort by default", async () => {
  expect(await requestBody()).toMatchObject({
    model: "deepseek-v4-pro",
    thinking: { type: "enabled" },
    reasoning_effort: "max",
  });
});

it("runs low-effort calls on Flash with thinking off", async () => {
  const body = await requestBody({ reasoningEffort: "low" });
  expect(body).toMatchObject({
    model: "deepseek-flash",
    thinking: { type: "disabled" },
  });
  expect(body.reasoning_effort).toBeUndefined();
});

// In json_object mode DeepSeek answers without calling tools, so website
// research never ran its required competitor search.
it("leaves structured output with tools free to call them", async () => {
  expect((await requestBody({ withOutput: true })).response_format).toEqual({
    type: "json_object",
  });
  expect(
    (await requestBody({ withOutput: true, withTools: true })).response_format,
  ).toBeUndefined();
});
