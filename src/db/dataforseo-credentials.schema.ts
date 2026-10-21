import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { organization } from "./better-auth-schema";

// One DataForSEO key per workspace, saved by its members in BYOK mode
// (src/lib/byok.ts). The key is ciphertext; only the login is shown back.
export const dataforseoCredentials = sqliteTable("dataforseo_credentials", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  login: text("login").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  updatedByUserId: text("updated_by_user_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
