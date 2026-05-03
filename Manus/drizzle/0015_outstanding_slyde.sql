CREATE TABLE `beleid_suggestie` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gemeenteId` int NOT NULL,
	`triggerJurisprudentieId` int,
	`triggerBeleidsverwijzingId` int,
	`documentNaam` varchar(300) NOT NULL,
	`documentType` varchar(100),
	`bronUrl` varchar(500) NOT NULL,
	`bronType` enum('gemeente_website','overheid_nl','lokaleregelgeving_nl','google_search','ruimtelijkeplannen_nl') NOT NULL,
	`gevondenDatum` timestamp,
	`geschattePublicatieDatum` timestamp,
	`bestandsgrootte` int,
	`aiSamenvatting` text,
	`aiRelevantie` int DEFAULT 50,
	`status` enum('pending','bevestigd','afgewezen','vervangen','toegevoegd') DEFAULT 'pending',
	`bevestigdDoor` int,
	`bevestigdOp` timestamp,
	`afwijzingsReden` text,
	`kennisbankItemId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beleid_suggestie_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurisprudentie` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ecli` varchar(100) NOT NULL,
	`instantie` varchar(100) NOT NULL,
	`instantieCode` varchar(20),
	`datumUitspraak` timestamp,
	`datumPublicatie` timestamp,
	`zaaknummer` varchar(100),
	`rechtsgebied` enum('bestuursrecht_omgevingsrecht','bestuursrecht_algemeen','civielrecht_goederenrecht','overig') DEFAULT 'bestuursrecht_omgevingsrecht',
	`titel` text,
	`inhoudsindicatie` text,
	`volledigeTekst` longtext,
	`aiSamenvatting` text,
	`aiToetsingscriteria` text,
	`aiBeleidsverwijzingen` text,
	`relevantieScore` int DEFAULT 50,
	`isOmgevingswetRelevant` boolean DEFAULT true,
	`omgevingswetNotitie` text,
	`bronUrl` varchar(500),
	`status` enum('nieuw','verwerkt','gearchiveerd') DEFAULT 'nieuw',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jurisprudentie_id` PRIMARY KEY(`id`),
	CONSTRAINT `jurisprudentie_ecli_unique` UNIQUE(`ecli`)
);
--> statement-breakpoint
CREATE TABLE `jurisprudentie_beleidsverwijzing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisprudentieId` int NOT NULL,
	`beleidsNaam` varchar(300) NOT NULL,
	`beleidsType` varchar(100),
	`gemeenteInJurisprudentie` varchar(100),
	`genoemdeNormen` text,
	`citaat` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisprudentie_beleidsverwijzing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurisprudentie_crawler_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crawlDatum` timestamp NOT NULL DEFAULT (now()),
	`rechtsgebied` varchar(100),
	`aantalGevonden` int DEFAULT 0,
	`aantalNieuw` int DEFAULT 0,
	`aantalBijgewerkt` int DEFAULT 0,
	`aantalFouten` int DEFAULT 0,
	`status` enum('running','completed','failed') DEFAULT 'running',
	`foutmelding` text,
	`duurMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisprudentie_crawler_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurisprudentie_themas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisprudentieId` int NOT NULL,
	`thema` enum('omgevingsvergunning_bouwen','omgevingsvergunning_milieu','bestemmingsplan_wijziging','afwijking_bestemmingsplan','bopa_procedure','welstandstoets','monumenten_erfgoed','natura2000_stikstof','geluidhinder','parkeren','handhaving','planschade','ladder_duurzame_verstedelijking','kruimelgevallenregeling','belangenafweging','motiveringsgebrek','zorgvuldigheid','overig') NOT NULL,
	`themaRelevantie` int DEFAULT 50,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisprudentie_themas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurisprudentie_toetsingskader_link` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisprudentieId` int NOT NULL,
	`toetsingskaderNaam` varchar(200) NOT NULL,
	`toetsingskaderCategorie` varchar(100),
	`leerpunt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisprudentie_toetsingskader_link_id` PRIMARY KEY(`id`)
);
