CREATE TABLE "cms_media_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_media_versions" ADD CONSTRAINT "cms_media_versions_asset_id_cms_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cms_media_versions_asset_version_uidx" ON "cms_media_versions" USING btree ("asset_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_media_versions_storage_key_uidx" ON "cms_media_versions" USING btree ("storage_key");