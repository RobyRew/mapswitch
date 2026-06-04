PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_saved_links` (
	`slug` text PRIMARY KEY NOT NULL,
	`userId` text,
	`ownerToken` text,
	`ipHash` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`label` text,
	`createdAt` integer NOT NULL,
	`expiresAt` integer,
	`hitCount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_saved_links`("slug", "userId", "lat", "lng", "label", "createdAt", "expiresAt", "hitCount") SELECT "slug", "userId", "lat", "lng", "label", "createdAt", "expiresAt", "hitCount" FROM `saved_links`;--> statement-breakpoint
DROP TABLE `saved_links`;--> statement-breakpoint
ALTER TABLE `__new_saved_links` RENAME TO `saved_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `saved_links_user_idx` ON `saved_links` (`userId`);--> statement-breakpoint
CREATE INDEX `saved_links_owner_idx` ON `saved_links` (`ownerToken`);--> statement-breakpoint
CREATE INDEX `saved_links_iphash_idx` ON `saved_links` (`ipHash`);