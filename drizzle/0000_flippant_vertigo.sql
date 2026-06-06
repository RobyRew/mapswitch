CREATE TABLE `link_history` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`slug` text,
	`openedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slug`) REFERENCES `saved_links`(`slug`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `link_history_user_idx` ON `link_history` (`userId`,`openedAt`);--> statement-breakpoint
CREATE TABLE `logto_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`userId` text PRIMARY KEY NOT NULL,
	`defaultProviderId` text,
	`autoOpen` integer DEFAULT true NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saved_links` (
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
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_links_user_idx` ON `saved_links` (`userId`);--> statement-breakpoint
CREATE INDEX `saved_links_owner_idx` ON `saved_links` (`ownerToken`);--> statement-breakpoint
CREATE INDEX `saved_links_iphash_idx` ON `saved_links` (`ipHash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`logto_sub` text NOT NULL,
	`email` text,
	`name` text,
	`emailVerified` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_logto_sub_unique` ON `users` (`logto_sub`);