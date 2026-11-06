CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`password` text NOT NULL,
	`profile` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_phone_unique` ON `accounts` (`phone`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`workspace` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL
);
