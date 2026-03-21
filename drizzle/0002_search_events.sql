CREATE TABLE `search_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query` text NOT NULL,
	`query_normalized` text,
	`page` text NOT NULL,
	`city_context` text,
	`action` text NOT NULL,
	`layer` text,
	`result_count` integer,
	`clicked_type` text,
	`clicked_id` text,
	`session_id` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_search_events_created` ON `search_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_search_events_query` ON `search_events` (`query_normalized`);
--> statement-breakpoint
CREATE INDEX `idx_search_events_session` ON `search_events` (`session_id`);
