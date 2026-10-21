import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { DataforseoCredentialRepository } from "@/server/features/dataforseo-key/repositories/DataforseoCredentialRepository";
import { runWithDataforseoApiKey } from "@/server/lib/dataforseo/api-key-scope";
import { fetchUserData } from "@/server/lib/dataforseo/appendix";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { MIN_BETTER_AUTH_SECRET_LENGTH } from "@/shared/selfhost-checks";

// A key used only for these credentials. The audit worker decrypts them for
// Lighthouse calls and crawls untrusted sites, so it must not hold
// BETTER_AUTH_SECRET.
async function getEncryptionKey(): Promise<string> {
  const secret = (await getOptionalEnvValue("DATAFORSEO_KEY_SECRET"))?.trim();
  if (!secret || secret.length < MIN_BETTER_AUTH_SECRET_LENGTH) {
    throw new AppError(
      "AUTH_CONFIG_MISSING",
      `Set DATAFORSEO_KEY_SECRET to at least ${MIN_BETTER_AUTH_SECRET_LENGTH} characters to store DataForSEO keys. It encrypts them.`,
    );
  }
  return secret;
}

// AppError messages reach MCP agents verbatim (tool-error-message.ts).
const MISSING_KEY_MESSAGE =
  "No DataForSEO API key is saved for this workspace. Add one in OpenSEO Settings.";

/** What the client sees. The key itself never leaves the server. */
interface DataforseoKeySummary {
  login: string;
  updatedAt: string;
}

async function getKeySummary(
  organizationId: string,
): Promise<DataforseoKeySummary | null> {
  const row =
    await DataforseoCredentialRepository.getForOrganization(organizationId);
  return row ? { login: row.login, updatedAt: row.updatedAt } : null;
}

/**
 * Checks the key against DataForSEO's free account endpoint before saving it,
 * so a typo shows up next to the form instead of failing every later call.
 */
async function saveKey(input: {
  organizationId: string;
  userId: string;
  apiKey: string;
}): Promise<{ key: DataforseoKeySummary } | { problem: string }> {
  const encryptionKey = await getEncryptionKey();
  let login: string | null | undefined;
  try {
    const userData = await runWithDataforseoApiKey(
      () => Promise.resolve(input.apiKey),
      fetchUserData,
    );
    login = userData?.login;
  } catch (error) {
    if (error instanceof AppError && error.code === "DATAFORSEO_AUTH_FAILED") {
      return {
        problem:
          "DataForSEO rejected this key. Copy the Base64 credentials from the DataForSEO API Access page.",
      };
    }
    throw error;
  }

  await DataforseoCredentialRepository.upsert({
    organizationId: input.organizationId,
    login: login || loginFromApiKey(input.apiKey),
    encryptedApiKey: await symmetricEncrypt({
      key: encryptionKey,
      data: input.apiKey,
    }),
    updatedByUserId: input.userId,
  });

  const key = await getKeySummary(input.organizationId);
  if (!key) throw new AppError("INTERNAL_ERROR");
  return { key };
}

function loginFromApiKey(apiKey: string): string {
  try {
    return atob(apiKey).split(":")[0] ?? "";
  } catch {
    return "";
  }
}

async function deleteKey(organizationId: string) {
  await DataforseoCredentialRepository.remove(organizationId);
}

/** Decrypts in memory only. The result must never be persisted or logged. */
async function openOrganizationKey(organizationId: string): Promise<string> {
  const row =
    await DataforseoCredentialRepository.getForOrganization(organizationId);
  if (!row) throw new AppError("DATAFORSEO_KEY_REQUIRED", MISSING_KEY_MESSAGE);
  const encryptionKey = await getEncryptionKey();
  try {
    return await symmetricDecrypt({
      key: encryptionKey,
      data: row.encryptedApiKey,
    });
  } catch {
    // A rotated DATAFORSEO_KEY_SECRET makes saved keys unreadable; the
    // workspace has to save its key again.
    console.warn(
      `Could not decrypt the DataForSEO key for organization ${organizationId}`,
    );
    throw new AppError("DATAFORSEO_KEY_REQUIRED", MISSING_KEY_MESSAGE);
  }
}

export const DataforseoKeyService = {
  getKeySummary,
  saveKey,
  deleteKey,
  openOrganizationKey,
} as const;
