CREATE TABLE `school_translations` (
	`school_id` text NOT NULL,
	`locale` text NOT NULL,
	`description` text DEFAULT '',
	`editorial_summary` text DEFAULT '',
	`pricing_notes` text DEFAULT '',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY (`school_id`, `locale`),
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `city_translations` (
	`slug` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
	`name_loc` text,
	PRIMARY KEY (`slug`, `locale`),
	FOREIGN KEY (`slug`) REFERENCES `cities`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_school_translations_locale` ON `school_translations` (`locale`);
--> statement-breakpoint
CREATE INDEX `idx_city_translations_locale` ON `city_translations` (`locale`);
