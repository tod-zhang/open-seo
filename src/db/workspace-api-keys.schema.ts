import { sql } from "drizzle-orm";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { organization } from "./better-auth-schema";

// Third-party API keys a workspace saves for itself in BYOK mode
// (src/lib/byok.ts), one per provider. The key is ciphertext; only the label
// (the DataForSEO login, or the OpenRouter key's last characters) is shown back.
export const workspaceApiKeys = sqliteTable(
  "workspace_api_keys",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["dataforseo", "openrouter"],
    }).notNull(),
    label: text("label").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    updatedByUserId: text("updated_by_user_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.provider] })],
);
