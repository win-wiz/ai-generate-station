ALTER TABLE `ai-generate-station_user` ADD `password` text(255);--> statement-breakpoint
ALTER TABLE `ai-generate-station_user` ADD `loginFailedCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai-generate-station_user` ADD `lastLoginFailedAt` integer;--> statement-breakpoint
ALTER TABLE `ai-generate-station_user` ADD `lockedUntil` integer;--> statement-breakpoint
ALTER TABLE `ai-generate-station_user` ADD `createdAt` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
ALTER TABLE `ai-generate-station_user` ADD `updatedAt` integer;