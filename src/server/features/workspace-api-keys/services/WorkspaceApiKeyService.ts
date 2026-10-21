import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { WorkspaceApiKeyRepository } from "@/server/features/workspace-api-keys/repositories/WorkspaceApiKeyRepository";
import { runWithDataforseoApiKey } from "@/server/lib/dataforseo/api-key-scope";
import { fetchUserData } from "@/server/lib/dataforseo/appendix";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { MIN_BETTER_AUTH_SECRET_LENGTH } from "@/shared/selfhost-checks";
import type { WorkspaceApiKeyProvider } from "@/types/schemas/workspaceApiKeys";

// A key used only for these credentials. The audit worker decrypts DataForSEO
// keys for Lighthouse calls and crawls untrusted sites, so it must not hold
// BETTER_AUTH_SECRET.
async function getEncryptionKey(): Promise<string> {
  const secret = (await getOptionalEnvValue("WORKSPACE_KEY_SECRET"))?.trim();
  if (!secret || secret.length < MIN_BETTER_AUTH_SECRET_LENGTH) {
    throw new AppError(
      "AUTH_CONFIG_MISSING",
      `Set WORKSPACE_KEY_SECRET to at least ${MIN_BETTER_AUTH_SECRET_LENGTH} characters to store workspace API keys. It encrypts them.`,
    );
  }
  return secret;
}

// AppError messages reach MCP agents and SAM verbatim.
const MISSING_KEY = {
  dataforseo: {
    code: "DATAFORSEO_KEY_REQUIRED",
    message:
      "No DataForSEO API key is saved for this workspace. Add one in OpenSEO Settings.",
  },
  openrouter: {
    code: "OPENROUTER_KEY_REQUIRED",
    message:
      "No OpenRouter API key is saved for this workspace. Add one in OpenSEO Settings to use AI features.",
  },
} as const;

/** What the client sees. The key itself never leaves the server. */
interface WorkspaceApiKeySummary {
  label: string;
  updatedAt: string;
}

async function getKeySummaries(
  organizationId: string,
): Promise<Record<WorkspaceApiKeyProvider, WorkspaceApiKeySummary | null>> {
  const rows =
    await WorkspaceApiKeyRepository.listForOrganization(organizationId);
  const summary = (provider: WorkspaceApiKeyProvider) => {
    const row = rows.find((candidate) => candidate.provider === provider);
    return row ? { label: row.label, updatedAt: row.updatedAt } : null;
  };
  return {
    dataforseo: summary("dataforseo"),
    openrouter: summary("openrouter"),
  };
}

async function hasKey(
  organizationId: string,
  provider: WorkspaceApiKeyProvider,
): Promise<boolean> {
  return Boolean(await WorkspaceApiKeyRepository.get(organizationId, provider));
}

/**
 * Checks the key against the provider's free account endpoint before saving
 * it, so a typo shows up next to the form instead of failing every later call.
 * Returns the label to show for it, or the problem.
 */
async function checkKey(
  provider: WorkspaceApiKeyProvider,
  apiKey: string,
): Promise<{ label: string } | { problem: string }> {
  if (provider === "dataforseo") {
    try {
      const userData = await runWithDataforseoApiKey(
        () => Promise.resolve(apiKey),
        fetchUserData,
      );
      return { label: userData?.login || loginFromDataforseoKey(apiKey) };
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === "DATAFORSEO_AUTH_FAILED"
      ) {
        return {
          problem:
            "DataForSEO rejected this key. Copy the Base64 credentials from the DataForSEO API Access page.",
        };
      }
      throw error;
    }
  }

  const response = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403) {
    return {
      problem:
        "OpenRouter rejected this key. Create a key at openrouter.ai/settings/keys and paste it here.",
    };
  }
  if (!response.ok) throw new AppError("UPSTREAM_UNAVAILABLE");
  return { label: `…${apiKey.slice(-4)}` };
}

function loginFromDataforseoKey(apiKey: string): string {
  try {
    return atob(apiKey).split(":")[0] ?? "";
  } catch {
    return "";
  }
}

async function saveKey(input: {
  organizationId: string;
  userId: string;
  provider: WorkspaceApiKeyProvider;
  apiKey: string;
}): Promise<{ key: WorkspaceApiKeySummary } | { problem: string }> {
  const encryptionKey = await getEncryptionKey();
  const checked = await checkKey(input.provider, input.apiKey);
  if ("problem" in checked) return checked;

  await WorkspaceApiKeyRepository.upsert({
    organizationId: input.organizationId,
    provider: input.provider,
    label: checked.label,
    encryptedKey: await symmetricEncrypt({
      key: encryptionKey,
      data: input.apiKey,
    }),
    updatedByUserId: input.userId,
  });

  const key = (await getKeySummaries(input.organizationId))[input.provider];
  if (!key) throw new AppError("INTERNAL_ERROR");
  return { key };
}

async function deleteKey(
  organizationId: string,
  provider: WorkspaceApiKeyProvider,
) {
  await WorkspaceApiKeyRepository.remove(organizationId, provider);
}

/** Decrypts in memory only. The result must never be persisted or logged. */
async function openKey(
  organizationId: string,
  provider: WorkspaceApiKeyProvider,
): Promise<string> {
  const missing = MISSING_KEY[provider];
  const row = await WorkspaceApiKeyRepository.get(organizationId, provider);
  if (!row) throw new AppError(missing.code, missing.message);
  const encryptionKey = await getEncryptionKey();
  try {
    return await symmetricDecrypt({
      key: encryptionKey,
      data: row.encryptedKey,
    });
  } catch {
    // A rotated WORKSPACE_KEY_SECRET makes saved keys unreadable; the
    // workspace has to save its key again.
    console.warn(
      `Could not decrypt the ${provider} key for organization ${organizationId}`,
    );
    throw new AppError(missing.code, missing.message);
  }
}

export const WorkspaceApiKeyService = {
  getKeySummaries,
  hasKey,
  saveKey,
  deleteKey,
  openKey,
} as const;
