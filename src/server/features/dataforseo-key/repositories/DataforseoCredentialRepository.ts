import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dataforseoCredentials } from "@/db/schema";

async function getForOrganization(organizationId: string) {
  return db.query.dataforseoCredentials.findFirst({
    where: eq(dataforseoCredentials.organizationId, organizationId),
  });
}

async function upsert(input: {
  organizationId: string;
  login: string;
  encryptedApiKey: string;
  updatedByUserId: string;
}) {
  // Explicit ISO timestamps: the D1 column default is "YYYY-MM-DD HH:MM:SS",
  // which Date parses as local time.
  const now = new Date().toISOString();
  await db
    .insert(dataforseoCredentials)
    .values({ ...input, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: dataforseoCredentials.organizationId,
      set: {
        login: input.login,
        encryptedApiKey: input.encryptedApiKey,
        updatedByUserId: input.updatedByUserId,
        updatedAt: now,
      },
    });
}

async function remove(organizationId: string) {
  await db
    .delete(dataforseoCredentials)
    .where(eq(dataforseoCredentials.organizationId, organizationId));
}

export const DataforseoCredentialRepository = {
  getForOrganization,
  upsert,
  remove,
} as const;
