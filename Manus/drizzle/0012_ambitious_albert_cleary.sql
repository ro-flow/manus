ALTER TABLE `gemeenten` ADD `archeologieVrijstellingDiepteCm` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `gemeenten` ADD `archeologieVrijstellingOppervlakteM2` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `gemeenten` ADD `bodemonderzoekVrijstellingGebieden` text;--> statement-breakpoint
ALTER TABLE `gemeenten` ADD `bodemonderzoekVrijstellingPostcodes` text;