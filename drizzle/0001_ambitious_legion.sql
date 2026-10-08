CREATE TABLE `coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`order_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`user_key` text,
	`coupon_version` integer NOT NULL,
	`released` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`code`) REFERENCES `coupons`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `redemptions_code_idx` ON `coupon_redemptions` (`code`,`released`);--> statement-breakpoint
CREATE INDEX `redemptions_user_idx` ON `coupon_redemptions` (`code`,`user_key`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `discount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `paid_at` integer;
--> statement-breakpoint
CREATE TRIGGER coupon_reservation_guard BEFORE INSERT ON coupon_redemptions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM coupons WHERE code=NEW.code AND active=1 AND version=NEW.coupon_version) THEN RAISE(ABORT,'COUPON_CHANGED') END;
 SELECT CASE WHEN (SELECT json_extract(data,'$.usageLimit') FROM coupons WHERE code=NEW.code)>0 AND (SELECT COUNT(*) FROM coupon_redemptions WHERE code=NEW.code AND released=0)>=(SELECT json_extract(data,'$.usageLimit') FROM coupons WHERE code=NEW.code) THEN RAISE(ABORT,'COUPON_LIMIT') END;
 SELECT CASE WHEN (SELECT json_extract(data,'$.perCustomerLimit') FROM coupons WHERE code=NEW.code)>0 AND (NEW.user_key IS NULL OR (SELECT COUNT(*) FROM coupon_redemptions WHERE code=NEW.code AND user_key=NEW.user_key AND released=0)>=(SELECT json_extract(data,'$.perCustomerLimit') FROM coupons WHERE code=NEW.code)) THEN RAISE(ABORT,'COUPON_LIMIT') END;
END;
