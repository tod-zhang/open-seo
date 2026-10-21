import { isByokMode } from "@/lib/byok";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";

// Reads its two variables itself, the same way runtime-env does (process.env
// first, then the Worker env), so the many tests that mock runtime-env don't
// have to know about BYOK.
async function readEnv(name: string): Promise<string | undefined> {
  const processValue =
    typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (processValue) return processValue;
  try {
    const { env } = await import("cloudflare:workers");
    const value: unknown = Reflect.get(env, name);
    return typeof value === "string" ? value : undefined;
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
