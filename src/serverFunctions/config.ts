import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { DataforseoKeyService } from "@/server/features/dataforseo-key/services/DataforseoKeyService";
import { isByokServerMode } from "@/server/lib/byok-mode";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    // BYOK: the workspace's own key, saved in Settings.
    if (await isByokServerMode()) {
      const key = await DataforseoKeyService.getKeySummary(
        context.organizationId,
      );
      return { configured: key !== null };
    }
    const configured = Boolean(env.DATAFORSEO_API_KEY?.trim());
    return { configured };
  });
