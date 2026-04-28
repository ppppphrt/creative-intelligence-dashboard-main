CREATE TABLE `ads_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adId` varchar(64) NOT NULL,
	`adName` varchar(255) NOT NULL,
	`campaignName` varchar(255),
	`campaignId` varchar(64),
	`adsetId` varchar(64),
	`accountId` varchar(64) NOT NULL,
	`spend` decimal(12,2) NOT NULL,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`purchases` int DEFAULT 0,
	`revenue` decimal(12,2) DEFAULT '0',
	`cpa` decimal(12,2),
	`roas` decimal(12,4),
	`cpm` decimal(12,2),
	`reach` int DEFAULT 0,
	`metricDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ads_performance_id` PRIMARY KEY(`id`),
	CONSTRAINT `ads_performance_adId_unique` UNIQUE(`adId`)
);
--> statement-breakpoint
CREATE TABLE `ai_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`concept` varchar(255),
	`hookType` varchar(255),
	`format` varchar(255),
	`insightType` enum('TOP_PERFORMER','UNDERPERFORMER') NOT NULL,
	`insight` text NOT NULL,
	`recommendation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concept_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`concept` varchar(255) NOT NULL,
	`totalSpend` decimal(12,2) DEFAULT '0',
	`avgRoas` decimal(12,4),
	`avgCpa` decimal(12,2),
	`adsCount` int DEFAULT 0,
	`decision` enum('SCALE','ITERATE','KILL'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `concept_summary_id` PRIMARY KEY(`id`),
	CONSTRAINT `concept_summary_concept_unique` UNIQUE(`concept`)
);
--> statement-breakpoint
CREATE TABLE `creative_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creativeId` varchar(64) NOT NULL,
	`adId` varchar(64) NOT NULL,
	`creativeUrl` text,
	`thumbnailUrl` text,
	`caption` text,
	`concept` varchar(255),
	`persona` varchar(255),
	`hookType` varchar(255),
	`format` varchar(255),
	`status` enum('NEED_TAGGING','READY') DEFAULT 'NEED_TAGGING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creative_library_id` PRIMARY KEY(`id`),
	CONSTRAINT `creative_library_creativeId_unique` UNIQUE(`creativeId`)
);
--> statement-breakpoint
CREATE TABLE `weekly_digests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStartDate` date NOT NULL,
	`topConcepts` text,
	`budgetAllocation` text,
	`underperformers` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_digests_id` PRIMARY KEY(`id`)
);
