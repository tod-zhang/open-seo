CREATE TABLE "dataforseo_credentials" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dataforseo_credentials" ADD CONSTRAINT "dataforseo_credentials_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;