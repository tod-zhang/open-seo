import { generateText } from "ai";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { buildChatAgentModel } from "./openrouter";

async function requestBody(reasoningEffort?: "max" | "low") {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    Response.json({
      choices: [
        {
          message: { role: "assistant", content: "ok" },
          finish_reason: "stop",
        },
      ],
    }),
  );
  await generateText({
    model: buildChatAgentModel("key", undefined, reasoningEffort),
    prompt: "hi",
  });
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.deepseek.com/chat/completions",
    expect.anything(),
  );
  return z
    .object({
      model: z.string(),
      thinking: z.object({ type: z.string() }),
      reasoning_effort: z.string().optional(),
    })
    .parse(JSON.parse(z.string().parse(fetchMock.mock.calls[0]?.[1]?.body)));
}

it("calls DeepSeek V4 Pro with thinking at max effort by default", async () => {
  expect(await requestBody()).toMatchObject({
    model: "deepseek-v4-pro",
    thinking: { type: "enabled" },
    reasoning_effort: "max",
  });
});

it("turns thinking off for low-effort calls", async () => {
  const body = await requestBody("low");
  expect(body.thinking).toEqual({ type: "disabled" });
  expect(body.reasoning_effort).toBeUndefined();
});
