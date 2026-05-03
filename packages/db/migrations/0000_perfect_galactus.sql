DO $$ BEGIN
 CREATE TYPE "public"."aanvraag_status" AS ENUM('concept', 'ingediend', 'in_behandeling', 'afgehandeld', 'geweigerd');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aanvragen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gemeente" varchar(100) NOT NULL,
	"gebiedstype" varchar(100),
	"activiteit_type" varchar(200),
	"activiteit_omschrijving" text,
	"status" "aanvraag_status" DEFAULT 'concept' NOT NULL,
	"pdf_blob_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aanvrager_pii" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aanvraag_id" uuid NOT NULL,
	"naam" text NOT NULL,
	"email" text,
	"telefoon" text,
	"adres" text,
	"postcode" varchar(10),
	"woonplaats" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aanvrager_pii_aanvraag_id_unique" UNIQUE("aanvraag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aanvraag_id" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100),
	"sanitized_payload" jsonb NOT NULL,
	"ai_response" text,
	"duration_ms" varchar(20),
	"privacy_blocked" boolean DEFAULT false NOT NULL,
	"error_message" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aanvrager_pii" ADD CONSTRAINT "aanvrager_pii_aanvraag_id_aanvragen_id_fk" FOREIGN KEY ("aanvraag_id") REFERENCES "public"."aanvragen"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_audit_log" ADD CONSTRAINT "ai_audit_log_aanvraag_id_aanvragen_id_fk" FOREIGN KEY ("aanvraag_id") REFERENCES "public"."aanvragen"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aanvragen_gemeente_idx" ON "aanvragen" ("gemeente");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_log_aanvraag_idx" ON "ai_audit_log" ("aanvraag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_log_timestamp_idx" ON "ai_audit_log" ("timestamp");