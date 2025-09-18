CREATE TABLE `ai-generate-station_task` (
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
CREATE INDEX `task_user_id_idx` ON `ai-generate-station_task` (`userId`);--> statement-breakpoint
CREATE INDEX `task_type_idx` ON `ai-generate-station_task` (`taskType`);--> statement-breakpoint
CREATE INDEX `task_status_idx` ON `ai-generate-station_task` (`status`);--> statement-breakpoint
CREATE INDEX `task_created_at_idx` ON `ai-generate-station_task` (`createdAt`);--> statement-breakpoint
DROP TABLE `ai-generate-station_ai_generation_task`;