import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { WorkspaceApiKeyService } from "@/server/features/workspace-api-keys/services/WorkspaceApiKeyService";
import { isByokServerMode } from "@/server/lib/byok-mode";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    // BYOK: the workspace's own key, saved in Settings.
    if (await isByokServerMode()) {
      return {
        configured: await WorkspaceApiKeyService.hasKey(
          context.organizationId,
          "dataforseo",
        ),
      };
    }
    const configured = Boolean(env.DATAFORSEO_API_KEY?.trim());
    return { configured };
  });
