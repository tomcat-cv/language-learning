ALTER TABLE "dictionary_entries" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "kanji_entries" ADD COLUMN "active" boolean DEFAULT true NOT NULL;