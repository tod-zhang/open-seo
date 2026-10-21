import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceApiKeys } from "@/db/schema";
import type { WorkspaceApiKeyProvider } from "@/types/schemas/workspaceApiKeys";

function byKey(organizationId: string, provider: WorkspaceApiKeyProvider) {
  return and(
    eq(workspaceApiKeys.organizationId, organizationId),
    eq(workspaceApiKeys.provider, provider),
  );
}

async function listForOrganization(organizationId: string) {
  return db
    .select()
    .from(workspaceApiKeys)
    .where(eq(workspaceApiKeys.organizationId, organizationId));
}

async function get(organizationId: string, provider: WorkspaceApiKeyProvider) {
  const [row] = await db
    .select()
    .from(workspaceApiKeys)
    .where(byKey(organizationId, provider));
  return row;
}

async function upsert(input: {
  organizationId: string;
  provider: WorkspaceApiKeyProvider;
  label: string;
  encryptedKey: string;
  updatedByUserId: string;
}) {
  // Explicit ISO timestamps: the D1 column default is "YYYY-MM-DD HH:MM:SS",
  // which Date parses as local time.
  const now = new Date().toISOString();
  await db
    .insert(workspaceApiKeys)
    .values({ ...input, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [workspaceApiKeys.organizationId, workspaceApiKeys.provider],
      set: {
        label: input.label,
        encryptedKey: input.encryptedKey,
        updatedByUserId: input.updatedByUserId,
        updatedAt: now,
      },
    });
}

async function remove(
  organizationId: string,
  provider: WorkspaceApiKeyProvider,
) {
  await db.delete(workspaceApiKeys).where(byKey(organizationId, provider));
}

export const WorkspaceApiKeyRepository = {
  listForOrganization,
  get,
  upsert,
  remove,
} as const;
