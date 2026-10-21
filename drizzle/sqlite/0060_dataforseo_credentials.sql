CREATE TABLE `dataforseo_credentials` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`updated_by_user_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
