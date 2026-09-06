CREATE TABLE "market_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"default_locale" text NOT NULL,
	"fallback_market_code" text,
	"fallback_locale" text,
	"is_canonical" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_password_credentials" ALTER COLUMN "algorithm" SET DEFAULT 'scrypt';--> statement-breakpoint
CREATE UNIQUE INDEX "market_editions_code_uidx" ON "market_editions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "market_editions_delivery_idx" ON "market_editions" USING btree ("enabled","is_canonical");--> statement-breakpoint
INSERT INTO "market_editions" (
	"code",
	"display_name",
	"default_locale",
	"fallback_market_code",
	"fallback_locale",
	"is_canonical",
	"enabled"
) VALUES
	('uae', 'United Arab Emirates', 'en', NULL, NULL, true, true),
	('ksa', 'Kingdom of Saudi Arabia', 'en', 'uae', 'en', false, true),
	('turkiye', 'Türkiye', 'en', 'uae', 'en', false, true),
	('europe', 'Europe', 'en', 'uae', 'en', false, true)
ON CONFLICT ("code") DO NOTHING;