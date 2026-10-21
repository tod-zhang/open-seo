import { sql } from "drizzle-orm";
import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { organization } from "./better-auth-schema";

// See src/db/pg/app.schema.ts for why timestamps are ISO-8601 UTC text.
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const workspaceApiKeys = pgTable(
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
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.provider] })],
);
