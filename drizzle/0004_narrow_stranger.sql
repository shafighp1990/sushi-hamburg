CREATE TABLE `order_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sender` text NOT NULL,
	`text` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_messages_retry_idx` ON `order_messages` (`order_id`,`sender`,`client_id`);--> statement-breakpoint
CREATE INDEX `order_messages_order_idx` ON `order_messages` (`order_id`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `estimated_arrival_at` integer;