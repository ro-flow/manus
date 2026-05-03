ALTER TABLE `kennisbank_documenten` ADD `juridischeStatus` enum('normstellend','richtinggevend','afwegingskader');--> statement-breakpoint
ALTER TABLE `kennisbank_documenten` ADD `isBindend` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `kennisbank_documenten` ADD `isConcreetGenoeg` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `kennisbank_documenten` ADD `heeftTweezijdigeWerking` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `kennisbank_items` ADD `juridischeStatus` enum('normstellend','richtinggevend','afwegingskader');--> statement-breakpoint
ALTER TABLE `kennisbank_items` ADD `isBindend` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `kennisbank_items` ADD `isConcreetGenoeg` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `kennisbank_items` ADD `heeftTweezijdigeWerking` boolean DEFAULT false;