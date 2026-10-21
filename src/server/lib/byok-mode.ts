import { isByokMode } from "@/lib/byok";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";

// Fails closed to "not BYOK" when the variable can't be read: many tests mock
// runtime-env without getOptionalEnvValue and don't need to know about BYOK.
async function readEnv(name: string): Promise<string | undefined> {
  try {
    return await getOptionalEnvValue(name);
  } catch {
    return undefined;
  }
}

export async function isByokServerMode(): Promise<boolean> {
  return isByokMode(
    await readEnv("AUTH_MODE"),
    await readEnv("DATAFORSEO_BYOK"),
  );
}

/** Autumn credit billing runs in hosted mode, unless the deployment is BYOK. */
export async function isHostedBillingEnabled(): Promise<boolean> {
  return (await isHostedServerAuthMode()) && !(await isByokServerMode());
}

/**
 * Whether DataForSEO calls can run at all: on the operator's key, or in BYOK
 * mode on each workspace's own (a missing one fails the call itself).
 */
export async function isDataforseoProviderConfigured(): Promise<boolean> {
  return (
    (await isByokServerMode()) ||
    Boolean(await getOptionalEnvValue("DATAFORSEO_API_KEY"))
  );
}

/**
 * The OpenRouter key AI calls for this workspace run on: in BYOK mode the
 * workspace's own (OPENROUTER_KEY_REQUIRED when none is saved), otherwise the
 * operator's OPENROUTER_API_KEY.
 */
export async function getOpenRouterApiKey(
  organizationId: string,
): Promise<string> {
  if (!(await isByokServerMode())) {
    return getRequiredEnvValue("OPENROUTER_API_KEY");
  }
  // Lazy: keeps the repository (and the database) out of this module's
  // import graph.
  const { WorkspaceApiKeyService } =
    await import("@/server/features/workspace-api-keys/services/WorkspaceApiKeyService");
  return WorkspaceApiKeyService.openKey(organizationId, "openrouter");
}
