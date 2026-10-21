CREATE TABLE `workspace_api_keys` (
	`organization_id` text NOT NULL,
	`provider` text NOT NULL,
	`label` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`updated_by_user_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	PRIMARY KEY(`organization_id`, `provider`),
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
