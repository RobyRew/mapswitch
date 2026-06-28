CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`label` text,
	`kind` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `places_user_kind_idx` ON `places` (`userId`,`kind`,`createdAt`);--> statement-breakpoint
ALTER TABLE `saved_links` ADD `customSlug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `saved_links_user_custom_idx` ON `saved_links` (`userId`,`customSlug`);--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);