import { AsyncLocalStorage } from "node:async_hooks";
import { isByokServerMode } from "@/server/lib/byok-mode";

// The DataForSEO key a call should use when it is not the operator's
// DATAFORSEO_API_KEY: in BYOK mode, the calling workspace's own key. Scoped
// with AsyncLocalStorage so the per-section fetchers and their callers need no
// extra parameter; core.ts reads it on every request. The scope holds a
// resolver, so opening one costs nothing until a DataForSEO call needs the key.
const apiKeyStore = new AsyncLocalStorage<() => Promise<string>>();

export function runWithDataforseoApiKey<T>(
  resolveApiKey: () => Promise<string>,
  fn: () => Promise<T>,
): Promise<T> {
  let resolved: Promise<string> | undefined;
  return apiKeyStore.run(() => (resolved ??= resolveApiKey()), fn);
}

export function getScopedDataforseoApiKey(): Promise<string> | undefined {
  return apiKeyStore.getStore()?.();
}

/**
 * Runs `fn` with the workspace's own DataForSEO key in scope, in BYOK mode.
 * Outside BYOK mode it runs `fn` as is, on the operator's DATAFORSEO_API_KEY.
 * The key is read and decrypted only when a DataForSEO call inside `fn` needs
 * it, and lives only in memory.
 */
export async function withOrganizationDataforseoKey<T>(
  organizationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!(await isByokServerMode())) return fn();
  return runWithDataforseoApiKey(async () => {
    // Lazy: keeps the repository (and the database) out of this module's
    // import graph, which every DataForSEO caller shares.
    const { WorkspaceApiKeyService } =
      await import("@/server/features/workspace-api-keys/services/WorkspaceApiKeyService");
    return WorkspaceApiKeyService.openKey(organizationId, "dataforseo");
  }, fn);
}
