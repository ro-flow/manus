CREATE TABLE IF NOT EXISTS "pilot_aanmeldingen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gemeente" varchar(100) NOT NULL,
	"naam" varchar(200) NOT NULL,
	"functie" varchar(200),
	"email" text NOT NULL,
	"telefoon" varchar(50),
	"aanvragen_per_jaar" varchar(50),
	"toelichting" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
