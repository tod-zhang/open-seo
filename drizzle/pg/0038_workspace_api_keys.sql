CREATE TABLE "workspace_api_keys" (
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "workspace_api_keys_organization_id_provider_pk" PRIMARY KEY("organization_id","provider")
);
--> statement-breakpoint
ALTER TABLE "workspace_api_keys" ADD CONSTRAINT "workspace_api_keys_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;