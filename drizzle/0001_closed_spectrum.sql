CREATE TABLE "study_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"knowledge_point_id" text NOT NULL,
	"task_type" text NOT NULL,
	"kind" text NOT NULL,
	"position" integer NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"status" text NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_date" text NOT NULL,
	"timezone_offset" integer NOT NULL,
	"daily_minutes" integer NOT NULL,
	"grammar_limit" integer NOT NULL,
	"vocabulary_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_plan_items" ADD CONSTRAINT "study_plan_items_plan_id_study_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."study_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_items" ADD CONSTRAINT "study_plan_items_knowledge_point_id_knowledge_points_id_fk" FOREIGN KEY ("knowledge_point_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "study_plan_items_plan_knowledge_idx" ON "study_plan_items" USING btree ("plan_id","knowledge_point_id");--> statement-breakpoint
CREATE INDEX "study_plan_items_plan_status_idx" ON "study_plan_items" USING btree ("plan_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "study_plans_user_date_idx" ON "study_plans" USING btree ("user_id","plan_date");