CREATE TABLE `toetsingsmatrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activiteitType` enum('nieuwbouw','verbouw','uitbouw','aanbouw','dakkapel','dakopbouw','functiewijziging','splitsen','samenvoegen','sloop','reclame','erfafscheiding','bijgebouw','overkapping','zonnepanelen','warmtepomp','evenement','terras','inrit','kappen','uitweg','overig') NOT NULL,
	`functieType` enum('wonen','horeca','detailhandel','kantoor','bedrijf','maatschappelijk','sport','recreatie','agrarisch','natuur','verkeer','water','gemengd','overig') NOT NULL,
	`verplichteKaders` json NOT NULL,
	`optioneleKaders` json,
	`toelichting` text,
	`aandachtspunten` text,
	`status` enum('actief','inactief') DEFAULT 'actief',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `toetsingsmatrix_id` PRIMARY KEY(`id`)
);
