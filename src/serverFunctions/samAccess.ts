import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { WorkspaceApiKeyService } from "@/server/features/workspace-api-keys/services/WorkspaceApiKeyService";
import {
  isByokServerMode,
  isHostedBillingEnabled,
} from "@/server/lib/byok-mode";
import { requireProjectContext } from "@/serverFunctions/middleware";

const OPENROUTER_KEY_MISSING_MESSAGE =
  "OPENROUTER_API_KEY is not set for this deployment yet. Add it to your environment, restart OpenSEO, then confirm here.";

const projectScopedSchema = z.object({ projectId: z.string().min(1) });

type SamAccessStatus = {
  enabled: boolean;
  errorMessage: string | null;
};

// Gates the in-app AI agent (SAM) on a DeepSeek key being configured, the
// same way backlinks/AI-search gate on their DataForSEO subscriptions. Hosted
// deployments always have the key provisioned, so only self-hosted is checked.
export const getSamAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(projectScopedSchema)
  .handler(async ({ context }): Promise<SamAccessStatus> => {
    if (await isHostedBillingEnabled()) {
      return { enabled: true, errorMessage: null };
    }
    // BYOK: the workspace's own key, saved in Settings.
    if (await isByokServerMode()) {
      const enabled = await WorkspaceApiKeyService.hasKey(
        context.organizationId,
        "openrouter",
      );
      return {
        enabled,
        errorMessage: enabled
          ? null
          : "No DeepSeek API key is saved for this workspace yet. Add one in Settings, then confirm here.",
      };
    }

    const enabled = Boolean(await getOptionalEnvValue("OPENROUTER_API_KEY"));
    return {
      enabled,
      errorMessage: enabled ? null : OPENROUTER_KEY_MISSING_MESSAGE,
    };
  });
