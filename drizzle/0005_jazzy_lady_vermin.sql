CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"level" text NOT NULL,
	"attempt_id" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bank_id" integer NOT NULL,
	"level" text NOT NULL,
	"mode" text NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_question_banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"level" text NOT NULL,
	"title" text NOT NULL,
	"source_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_id" integer NOT NULL,
	"section" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer_index" integer NOT NULL,
	"explanation" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_bank_id_exam_question_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."exam_question_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_bank_id_exam_question_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."exam_question_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_user_level_idx" ON "certificates" USING btree ("user_id","level");--> statement-breakpoint
CREATE INDEX "exam_attempts_user_level_idx" ON "exam_attempts" USING btree ("user_id","level");--> statement-breakpoint
CREATE INDEX "exam_question_banks_level_source_idx" ON "exam_question_banks" USING btree ("level","source_type");--> statement-breakpoint
CREATE INDEX "exam_questions_bank_idx" ON "exam_questions" USING btree ("bank_id");