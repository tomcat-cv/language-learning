CREATE TABLE "content_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"source_version" text NOT NULL,
	"source_url" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"status" text NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"homepage_url" text NOT NULL,
	"download_url" text NOT NULL,
	"license_name" text NOT NULL,
	"license_url" text NOT NULL,
	"attribution_text" text NOT NULL,
	"update_frequency" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"curriculum_version" text NOT NULL,
	"level" text NOT NULL,
	"kind" text NOT NULL,
	"dictionary_entry_id" text,
	"kanji_literal" text,
	"rationale" text NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictionary_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"source_entry_id" text NOT NULL,
	"primary_kanji" text,
	"primary_reading" text NOT NULL,
	"is_common" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"last_import_id" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanji_entries" (
	"literal" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"stroke_count" integer,
	"grade" integer,
	"frequency" integer,
	"jlpt_legacy" integer,
	"payload" jsonb NOT NULL,
	"last_import_id" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_imports" ADD CONSTRAINT "content_imports_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_dictionary_entry_id_dictionary_entries_id_fk" FOREIGN KEY ("dictionary_entry_id") REFERENCES "public"."dictionary_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_kanji_literal_kanji_entries_literal_fk" FOREIGN KEY ("kanji_literal") REFERENCES "public"."kanji_entries"("literal") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictionary_entries" ADD CONSTRAINT "dictionary_entries_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictionary_entries" ADD CONSTRAINT "dictionary_entries_last_import_id_content_imports_id_fk" FOREIGN KEY ("last_import_id") REFERENCES "public"."content_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanji_entries" ADD CONSTRAINT "kanji_entries_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanji_entries" ADD CONSTRAINT "kanji_entries_last_import_id_content_imports_id_fk" FOREIGN KEY ("last_import_id") REFERENCES "public"."content_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_imports_source_started_idx" ON "content_imports" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE INDEX "curriculum_mappings_level_kind_idx" ON "curriculum_mappings" USING btree ("level","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_mappings_dictionary_version_idx" ON "curriculum_mappings" USING btree ("curriculum_version","dictionary_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_mappings_kanji_version_idx" ON "curriculum_mappings" USING btree ("curriculum_version","kanji_literal");--> statement-breakpoint
CREATE UNIQUE INDEX "dictionary_entries_source_entry_idx" ON "dictionary_entries" USING btree ("source_id","source_entry_id");--> statement-breakpoint
CREATE INDEX "dictionary_entries_primary_kanji_idx" ON "dictionary_entries" USING btree ("primary_kanji");--> statement-breakpoint
CREATE INDEX "dictionary_entries_primary_reading_idx" ON "dictionary_entries" USING btree ("primary_reading");--> statement-breakpoint
CREATE INDEX "kanji_entries_grade_idx" ON "kanji_entries" USING btree ("grade");--> statement-breakpoint
CREATE INDEX "kanji_entries_frequency_idx" ON "kanji_entries" USING btree ("frequency");
