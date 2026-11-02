CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`message` text NOT NULL,
	`ipHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `featured_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`userId` int NOT NULL,
	`method` enum('paypal','western') NOT NULL,
	`reference` varchar(256) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`duration` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`decidedAt` timestamp,
	`decidedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `featured_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brand` varchar(80) NOT NULL,
	`model` varchar(120) NOT NULL,
	`year` int NOT NULL,
	`color` varchar(64) NOT NULL,
	`price` decimal(14,2) NOT NULL,
	`currency` varchar(8) NOT NULL,
	`mileage` int NOT NULL,
	`location` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`transmission` varchar(64) NOT NULL,
	`fuel` varchar(64) NOT NULL,
	`condition` varchar(64) NOT NULL,
	`images` json NOT NULL,
	`status` enum('pending','approved','rejected','sold','archived') NOT NULL DEFAULT 'pending',
	`featured` boolean NOT NULL DEFAULT false,
	`featuredUntil` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_settings` (
	`id` int NOT NULL,
	`brands` json NOT NULL,
	`currencies` json NOT NULL,
	`terms` text NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(32) NOT NULL,
	`whatsapp` varchar(64) NOT NULL,
	`paypalEnabled` boolean NOT NULL DEFAULT false,
	`paypalUrl` varchar(512) NOT NULL,
	`westernEnabled` boolean NOT NULL DEFAULT false,
	`westernInstructions` text NOT NULL,
	`featuredPrice` decimal(14,2) NOT NULL,
	`featuredDays` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `market_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_nonces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nonceHash` varchar(64) NOT NULL,
	`redirectUri` varchar(1024) NOT NULL,
	`frontendOrigin` varchar(512),
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_nonces_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_nonces_nonce_hash_uq` UNIQUE(`nonceHash`)
);
--> statement-breakpoint
CREATE TABLE `uploaded_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(768) NOT NULL,
	`mime` varchar(32) NOT NULL,
	`bytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uploaded_assets_storage_key_uq` UNIQUE(`storageKey`),
	CONSTRAINT `uploaded_assets_url_uq` UNIQUE(`url`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `blocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `featured_requests` ADD CONSTRAINT `featured_requests_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `featured_requests` ADD CONSTRAINT `featured_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `featured_requests` ADD CONSTRAINT `featured_requests_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_assets` ADD CONSTRAINT `uploaded_assets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contact_messages_ip_created_idx` ON `contact_messages` (`ipHash`,`createdAt`);--> statement-breakpoint
CREATE INDEX `featured_requests_listing_status_idx` ON `featured_requests` (`listingId`,`status`);--> statement-breakpoint
CREATE INDEX `featured_requests_user_created_idx` ON `featured_requests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `listings_status_featured_created_idx` ON `listings` (`status`,`featured`,`createdAt`);--> statement-breakpoint
CREATE INDEX `listings_user_created_idx` ON `listings` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `oauth_nonces_expiry_idx` ON `oauth_nonces` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `uploaded_assets_user_created_idx` ON `uploaded_assets` (`userId`,`createdAt`);