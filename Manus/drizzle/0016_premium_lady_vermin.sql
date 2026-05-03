CREATE TABLE `scan_api_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36),
	`service` varchar(50),
	`endpoint` text,
	`requestMetaJson` json,
	`responseMetaJson` json,
	`status` varchar(10),
	`latencyMs` int,
	`errorText` text,
	`cacheHit` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_api_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_dossier_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`filename` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`storageUrl` text NOT NULL,
	`storageKey` text NOT NULL,
	`sizeBytes` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_dossier_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_dossiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`gemeenteId` int NOT NULL,
	`userId` int NOT NULL,
	`projectNaam` varchar(255),
	`status` enum('CREATED','UPLOADED','EXTRACTING','EXTRACTED','SCANNING','SCANNED','LLM_PROCESSING','LLM_DONE','EXPORTED','ERROR') NOT NULL DEFAULT 'CREATED',
	`errorMessage` text,
	`dsoMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scan_dossiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_dossiers_dossierId_unique` UNIQUE(`dossierId`)
);
--> statement-breakpoint
CREATE TABLE `scan_dso_result` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`activitiesJson` json,
	`indicativeOutcome` text,
	`submissionRequirementsJson` json,
	`competentAuthorityJson` json,
	`ruleRefsJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_dso_result_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_dso_result_dossierId_unique` UNIQUE(`dossierId`)
);
--> statement-breakpoint
CREATE TABLE `scan_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`kind` enum('PDF','JSON') NOT NULL,
	`storageUrl` text NOT NULL,
	`storageKey` text NOT NULL,
	`metaJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_indicator_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`theme` varchar(50),
	`humanName` varchar(200),
	`intersection` boolean,
	`distanceM` decimal(12,1),
	`status` enum('PRESENT','NEAR','NONE','UNKNOWN') DEFAULT 'UNKNOWN',
	`featuresJson` json,
	`mapLayersJson` json,
	`sourceJson` json,
	`notes` text,
	`narrative` text,
	`controlPointsJson` json,
	`relevanceScore` int DEFAULT 0,
	`isPriority` boolean DEFAULT false,
	`debugJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_indicator_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_llm_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`dossierId` varchar(36),
	`task` varchar(50) NOT NULL,
	`indicatorCode` varchar(50),
	`templateVersion` varchar(20) NOT NULL,
	`inputHash` varchar(64) NOT NULL,
	`outputJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_llm_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_llm_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `scan_normalized_location` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`rdX` decimal(12,2),
	`rdY` decimal(12,2),
	`lat` decimal(10,7),
	`lon` decimal(10,7),
	`addressText` varchar(500),
	`postcode` varchar(10),
	`woonplaats` varchar(100),
	`bagPandId` varchar(50),
	`bagVboId` varchar(50),
	`parcelId` varchar(100),
	`parcelAreaM2` decimal(12,2),
	`parcelGeometryGeojson` json,
	`bouwjaar` int,
	`gebruiksdoel` varchar(100),
	`pandStatus` varchar(100),
	`oppervlakte` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_normalized_location_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_normalized_location_dossierId_unique` UNIQUE(`dossierId`)
);
--> statement-breakpoint
CREATE TABLE `scan_plan_context` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` varchar(36) NOT NULL,
	`plansJson` json,
	`objectsJson` json,
	`rulesJson` json,
	`relevantRulesJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_plan_context_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_plan_context_dossierId_unique` UNIQUE(`dossierId`)
);
