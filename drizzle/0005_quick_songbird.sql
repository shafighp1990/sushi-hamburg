CREATE TABLE `review_accounts` (
	`alias` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_accounts_user_id_unique` ON `review_accounts` (`user_id`);