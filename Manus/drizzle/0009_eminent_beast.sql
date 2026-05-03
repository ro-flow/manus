ALTER TABLE `behandelrapport_log` MODIFY COLUMN `status` enum('verwerking','verzonden','mislukt','gearchiveerd') DEFAULT 'verwerking';--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `projectNaam` varchar(255);--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `projectOmschrijving` text;--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `aanvragerNaam` varchar(200);--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `woonplaats` varchar(100);--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `wgs84Lat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `wgs84Lng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `isNatura2000` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `isRijksmonument` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `isBeschermdGezicht` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `isGrondwaterbescherming` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `behandelrapport_log` ADD `rapportSamenvatting` text;