CREATE TABLE `ai-generate-station_account` (
	`userId` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`providerAccountId` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text,
	`session_state` text(255),
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `ai-generate-station_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `ai-generate-station_account` (`userId`);--> statement-breakpoint
CREATE TABLE `ai-generate-station_ai_generation_task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`taskType` text(50) NOT NULL,
	`prompt` text NOT NULL,
	`result` text,
	`status` text(20) DEFAULT 'pending' NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `ai-generate-station_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_user_id_idx` ON `ai-generate-station_ai_generation_task` (`userId`);--> statement-breakpoint
CREATE INDEX `task_type_idx` ON `ai-generate-station_ai_generation_task` (`taskType`);--> statement-breakpoint
CREATE INDEX `task_status_idx` ON `ai-generate-station_ai_generation_task` (`status`);--> statement-breakpoint
CREATE INDEX `task_created_at_idx` ON `ai-generate-station_ai_generation_task` (`createdAt`);--> statement-breakpoint
CREATE TABLE `ai-generate-station_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text(256) NOT NULL,
	`content` text,
	`status` text(20) DEFAULT 'draft' NOT NULL,
	`slug` text(256),
	`tags` text,
	`createdById` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	`publishedAt` integer,
	FOREIGN KEY (`createdById`) REFERENCES `ai-generate-station_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `post_created_by_idx` ON `ai-generate-station_post` (`createdById`);--> statement-breakpoint
CREATE INDEX `post_title_idx` ON `ai-generate-station_post` (`title`);--> statement-breakpoint
CREATE INDEX `post_status_idx` ON `ai-generate-station_post` (`status`);--> statement-breakpoint
CREATE INDEX `post_slug_idx` ON `ai-generate-station_post` (`slug`);--> statement-breakpoint
CREATE INDEX `post_published_at_idx` ON `ai-generate-station_post` (`publishedAt`);--> statement-breakpoint
CREATE TABLE `ai-generate-station_session` (
	`sessionToken` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `ai-generate-station_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `ai-generate-station_session` (`userId`);--> statement-breakpoint
CREATE TABLE `ai-generate-station_user_preference` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`theme` text(20) DEFAULT 'light' NOT NULL,
	`language` text(10) DEFAULT 'en' NOT NULL,
	`aiModel` text(50) DEFAULT 'gpt-3.5-turbo',
	`settings` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `ai-generate-station_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_id_unique_idx` ON `ai-generate-station_user_preference` (`userId`);--> statement-breakpoint
CREATE TABLE `ai-generate-station_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer DEFAULT (unixepoch()),
	`image` text(255)
);
--> statement-breakpoint
CREATE TABLE `ai-generate-station_verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
