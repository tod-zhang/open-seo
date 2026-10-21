import { isHostedAuthMode, isHostedClientAuthMode } from "@/lib/auth-mode";

// Bring-your-own-key mode (DATAFORSEO_BYOK=true) turns a hosted deployment into
// a free one: every workspace saves its own DataForSEO API key, DataForSEO
// calls run on that key, and the Autumn credit billing is switched off. It
// only applies on top of AUTH_MODE=hosted; self-hosted already runs on the
// operator's own key and has no billing.
export function isByokMode(
  authMode: string | null | undefined,
  byok: string | null | undefined,
) {
  return isHostedAuthMode(authMode) && byok?.trim() === "true";
}

export function isByokClientMode() {
  // Same build-time contract as isHostedClientAuthMode: keep the client
  // DATAFORSEO_BYOK aligned with the server runtime value.
  return isHostedClientAuthMode() && import.meta.env.DATAFORSEO_BYOK === "true";
}

/**
 * Search Console and Google Analytics need Google's sensitive read scopes,
 * which a free BYOK deployment doesn't get verified for, so BYOK turns them
 * off along with every screen and tool that reads them.
 */
export function isGoogleDataEnabled() {
  // Build-time like isByokClientMode, so the server bundle reads it too.
  return !isByokClientMode();
}

/**
 * Site audits crawl other people's sites from the deployment's own server,
 * which on a free BYOK deployment open to anyone risks the server's IP being
 * blocked, so BYOK turns audits off along with their screens and tools.
 * Build-time like isByokClientMode, so the server bundle reads it too.
 */
export function isSiteAuditEnabled() {
  return !isByokClientMode();
}

/**
 * The project Integrations tab (IndexNow, and the Shopify crawler access that
 * only audits use) is off in BYOK. Build-time, like the flags above.
 */
export function isProjectIntegrationsEnabled() {
  return !isByokClientMode();
}

/** The client half of isHostedBillingEnabled: hosted, and not BYOK. */
export function isHostedBillingClientMode() {
  return isHostedClientAuthMode() && !isByokClientMode();
}
