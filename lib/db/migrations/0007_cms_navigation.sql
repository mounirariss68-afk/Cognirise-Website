CREATE TABLE IF NOT EXISTS "cms_navigation_items" (
  "id" text PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "updated_by_user_id" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cms_navigation_items" ADD CONSTRAINT "cms_navigation_items_updated_by_user_id_cms_users_id_fk"
 FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;