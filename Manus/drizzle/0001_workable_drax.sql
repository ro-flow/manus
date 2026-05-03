CREATE TABLE `adviseurs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`naam` varchar(200) NOT NULL,
	`type` enum('extern','intern') NOT NULL,
	`categorie` varchar(100),
	`triggers` json,
	`termijnWeken` int,
	`grondslag` text,
	`contactEmail` varchar(320),
	`contactTelefoon` varchar(50),
	`regioCode` varchar(50),
	`isLandelijk` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adviseurs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `behandelrapport_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zaaknummer` varchar(100) NOT NULL,
	`gemeenteId` int NOT NULL,
	`behandelaarNaam` varchar(200),
	`behandelaarEmail` varchar(320),
	`seatId` int,
	`procedureType` enum('VERGUNNINGVRIJ','REGULIER','BOPA_REGULIER','BOPA_UITGEBREID'),
	`isVergunningvrij` boolean DEFAULT false,
	`adres` varchar(500),
	`kadastraalNummer` varchar(100),
	`rdX` decimal(12,2),
	`rdY` decimal(12,2),
	`pdfUrl` text,
	`rapportData` json,
	`status` enum('verwerking','verzonden','mislukt') DEFAULT 'verwerking',
	`verwerkingDuurSec` decimal(6,1),
	`aiKostenEur` decimal(8,4),
	`kennisbankBronnen` text,
	`datumRapport` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `behandelrapport_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beleidsdocumenten` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentNaam` varchar(255) NOT NULL,
	`documentType` enum('welstandsnota','parkeerbeleid','erfgoedbeleid','beleidsregels_afwijken','overig') NOT NULL,
	`gemeenteId` int NOT NULL,
	`url` text,
	`relevantieTags` text,
	`altijdOphalen` boolean DEFAULT false,
	`geminiFileId` varchar(255),
	`laatstGecontroleerd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beleidsdocumenten_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gemeente_regio_lookup` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gemeenteNaam` varchar(100) NOT NULL,
	`cbsCode` varchar(10) NOT NULL,
	`provincie` varchar(50) NOT NULL,
	`waterschapCode` varchar(50),
	`vrCode` varchar(50),
	`odCode` varchar(50),
	`ggdCode` varchar(50),
	CONSTRAINT `gemeente_regio_lookup_id` PRIMARY KEY(`id`),
	CONSTRAINT `gemeente_regio_lookup_gemeenteNaam_unique` UNIQUE(`gemeenteNaam`)
);
--> statement-breakpoint
CREATE TABLE `gemeenten` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gemeenteNaam` varchar(100) NOT NULL,
	`gemeenteCode` varchar(10) NOT NULL,
	`provincie` enum('Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','Noord-Brabant','Noord-Holland','Overijssel','Utrecht','Zeeland','Zuid-Holland') NOT NULL,
	`waterschapNaam` varchar(100),
	`waterschapCode` varchar(50),
	`vrNaam` varchar(100),
	`vrCode` varchar(50),
	`odNaam` varchar(100),
	`odCode` varchar(50),
	`ggdNaam` varchar(100),
	`ggdCode` varchar(50),
	`welstandsniveauDefault` enum('Regulier','Bijzonder','Soepel') DEFAULT 'Regulier',
	`heeftBeschermdGezicht` boolean DEFAULT false,
	`contactBeheerder` varchar(320),
	`lemonOrderId` varchar(100),
	`lemonSubscriptionId` varchar(100),
	`seatsGekocht` int DEFAULT 0,
	`status` enum('pending_activation','actief','inactief','geannuleerd') DEFAULT 'pending_activation',
	`lastPolicyUpdate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gemeenten_id` PRIMARY KEY(`id`),
	CONSTRAINT `gemeenten_gemeenteNaam_unique` UNIQUE(`gemeenteNaam`)
);
--> statement-breakpoint
CREATE TABLE `gemini_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`gemeenteId` int NOT NULL,
	`queryHash` varchar(64) NOT NULL,
	`response` json,
	`policyUpdateAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gemini_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `gemini_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`naam` varchar(200),
	`gemeenteId` int NOT NULL,
	`rol` enum('behandelaar','beheerder') NOT NULL DEFAULT 'behandelaar',
	`status` enum('actief','inactief','uitgenodigd') NOT NULL DEFAULT 'uitgenodigd',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`laatsteLogin` timestamp,
	CONSTRAINT `seats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin','gemeente_beheerder','ambtenaar_gebruiker') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `gemeenteId` int;