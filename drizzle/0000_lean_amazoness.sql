CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_point_id" text NOT NULL,
	"exercise_type" text NOT NULL,
	"answer" text NOT NULL,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_points" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"level" text NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_point_id" text NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_point_id" text NOT NULL,
	"event_type" text NOT NULL,
	"previous_state" jsonb,
	"next_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_states" (
	"user_id" text NOT NULL,
	"knowledge_point_id" text NOT NULL,
	"stage" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"interval_days" integer NOT NULL,
	"consecutive_successes" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_states_user_id_knowledge_point_id_pk" PRIMARY KEY("user_id","knowledge_point_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_knowledge_point_id_knowledge_points_id_fk" FOREIGN KEY ("knowledge_point_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_declarations" ADD CONSTRAINT "mastery_declarations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_declarations" ADD CONSTRAINT "mastery_declarations_knowledge_point_id_knowledge_points_id_fk" FOREIGN KEY ("knowledge_point_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_knowledge_point_id_knowledge_points_id_fk" FOREIGN KEY ("knowledge_point_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_knowledge_point_id_knowledge_points_id_fk" FOREIGN KEY ("knowledge_point_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_user_knowledge_idx" ON "attempts" USING btree ("user_id","knowledge_point_id");--> statement-breakpoint
CREATE INDEX "mastery_declarations_user_knowledge_idx" ON "mastery_declarations" USING btree ("user_id","knowledge_point_id");--> statement-breakpoint
CREATE INDEX "review_logs_user_knowledge_idx" ON "review_logs" USING btree ("user_id","knowledge_point_id");--> statement-breakpoint
CREATE INDEX "review_states_due_idx" ON "review_states" USING btree ("user_id","stage","due_at");