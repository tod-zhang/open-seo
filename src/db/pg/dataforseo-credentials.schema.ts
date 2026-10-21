import { sql } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { organization } from "./better-auth-schema";

// See src/db/pg/app.schema.ts for why timestamps are ISO-8601 UTC text.
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const dataforseoCredentials = pgTable("dataforseo_credentials", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  login: text("login").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  updatedByUserId: text("updated_by_user_id"),
  createdAt: text("created_at").notNull().default(isoNow),
  updatedAt: text("updated_at").notNull().default(isoNow),
});
