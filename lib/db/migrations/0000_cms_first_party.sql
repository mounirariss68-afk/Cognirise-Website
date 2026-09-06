CREATE TABLE "newsletter_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"market" text NOT NULL,
	"consent" boolean NOT NULL,
	"source_page" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"organization" text NOT NULL,
	"role" text,
	"market" text NOT NULL,
	"process_area" text NOT NULL,
	"challenge" text NOT NULL,
	"consent" boolean NOT NULL,
	"source_page" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email_digest" text NOT NULL,
	"ip_digest" text,
	"outcome" text NOT NULL,
	"failure_code" text,
	"metadata" jsonb,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_password_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"algorithm" text DEFAULT 'argon2id' NOT NULL,
	"password_version" integer DEFAULT 1 NOT NULL,
	"must_rotate" boolean DEFAULT false NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_digest" text NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"ip_digest" text,
	"user_agent" text,
	"mfa_satisfied_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_totp_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_secret" text NOT NULL,
	"encryption_key_version" integer NOT NULL,
	"verified_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'editor' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_document_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid NOT NULL,
	"target_document_id" uuid NOT NULL,
	"relation" text DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_document_terms" (
	"document_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_document_terms_document_id_term_id_pk" PRIMARY KEY("document_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "cms_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"canonical_slug" text,
	"title" text NOT NULL,
	"owner_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_market_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"market" text NOT NULL,
	"locale" text NOT NULL,
	"localized_slug" text,
	"publication_state" text DEFAULT 'draft' NOT NULL,
	"fallback_mode" text DEFAULT 'none' NOT NULL,
	"parity_complete" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum" text NOT NULL,
	"alt_text" text,
	"credit" text,
	"status" text DEFAULT 'active' NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_media_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"payload_version" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"content_digest" text NOT NULL,
	"workflow_state" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_taxonomy_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taxonomy_id" uuid NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"outcome" text DEFAULT 'success' NOT NULL,
	"request_id" text,
	"ip_digest" text,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_operation_receipts" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"subject_id" text NOT NULL,
	"request_digest" text NOT NULL,
	"result_digest" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_preview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_digest" text NOT NULL,
	"edition_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market" text NOT NULL,
	"source_path" text NOT NULL,
	"destination_document_id" uuid,
	"destination_url" text,
	"http_status" text DEFAULT '308' NOT NULL,
	"active_from" timestamp with time zone DEFAULT now() NOT NULL,
	"active_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cms_submission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_submission_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_to_user_id" uuid,
	"consent_granted" boolean NOT NULL,
	"consent_policy_version" text NOT NULL,
	"consent_captured_at" timestamp with time zone NOT NULL,
	"first_responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"deletion_due_at" timestamp with time zone NOT NULL,
	"notes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_analytics_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_digest" text NOT NULL,
	"policy_version" text NOT NULL,
	"analytics_allowed" boolean DEFAULT false NOT NULL,
	"marketing_allowed" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"country" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cms_analytics_daily" (
	"day" date NOT NULL,
	"market" text NOT NULL,
	"path" text NOT NULL,
	"event_name" text NOT NULL,
	"event_count" bigint DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_analytics_daily_day_market_path_event_name_pk" PRIMARY KEY("day","market","path","event_name")
);
--> statement-breakpoint
CREATE TABLE "cms_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"anonymous_id" text NOT NULL,
	"session_id" text,
	"consent_id" uuid,
	"market" text NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text,
	"properties" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_login_attempts" ADD CONSTRAINT "cms_login_attempts_user_id_cms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_password_credentials" ADD CONSTRAINT "cms_password_credentials_user_id_cms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_recovery_codes" ADD CONSTRAINT "cms_recovery_codes_user_id_cms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_sessions" ADD CONSTRAINT "cms_sessions_user_id_cms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_totp_credentials" ADD CONSTRAINT "cms_totp_credentials_user_id_cms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_references" ADD CONSTRAINT "cms_document_references_source_document_id_cms_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_references" ADD CONSTRAINT "cms_document_references_target_document_id_cms_documents_id_fk" FOREIGN KEY ("target_document_id") REFERENCES "public"."cms_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_terms" ADD CONSTRAINT "cms_document_terms_document_id_cms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_terms" ADD CONSTRAINT "cms_document_terms_term_id_cms_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."cms_taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_documents" ADD CONSTRAINT "cms_documents_owner_id_cms_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_market_editions" ADD CONSTRAINT "cms_market_editions_document_id_cms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD CONSTRAINT "cms_media_assets_uploaded_by_user_id_cms_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_media_references" ADD CONSTRAINT "cms_media_references_asset_id_cms_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_media_references" ADD CONSTRAINT "cms_media_references_document_id_cms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_revisions" ADD CONSTRAINT "cms_revisions_edition_id_cms_market_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."cms_market_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_revisions" ADD CONSTRAINT "cms_revisions_created_by_user_id_cms_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."cms_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_revisions" ADD CONSTRAINT "cms_revisions_approved_by_user_id_cms_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_taxonomy_terms" ADD CONSTRAINT "cms_taxonomy_terms_taxonomy_id_cms_taxonomies_id_fk" FOREIGN KEY ("taxonomy_id") REFERENCES "public"."cms_taxonomies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_audit_events" ADD CONSTRAINT "cms_audit_events_actor_user_id_cms_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_preview_sessions" ADD CONSTRAINT "cms_preview_sessions_edition_id_cms_market_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."cms_market_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_preview_sessions" ADD CONSTRAINT "cms_preview_sessions_created_by_user_id_cms_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_redirects" ADD CONSTRAINT "cms_redirects_destination_document_id_cms_documents_id_fk" FOREIGN KEY ("destination_document_id") REFERENCES "public"."cms_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_submission_events" ADD CONSTRAINT "cms_submission_events_workflow_id_cms_submission_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."cms_submission_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_submission_events" ADD CONSTRAINT "cms_submission_events_actor_user_id_cms_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_submission_workflows" ADD CONSTRAINT "cms_submission_workflows_assigned_to_user_id_cms_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_analytics_events" ADD CONSTRAINT "cms_analytics_events_consent_id_cms_analytics_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."cms_analytics_consents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_login_attempts_email_time_idx" ON "cms_login_attempts" USING btree ("email_digest","attempted_at");--> statement-breakpoint
CREATE INDEX "cms_login_attempts_ip_time_idx" ON "cms_login_attempts" USING btree ("ip_digest","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_recovery_codes_digest_uidx" ON "cms_recovery_codes" USING btree ("code_digest");--> statement-breakpoint
CREATE INDEX "cms_recovery_codes_user_idx" ON "cms_recovery_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_sessions_token_digest_uidx" ON "cms_sessions" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "cms_sessions_user_expiry_idx" ON "cms_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_totp_credentials_user_uidx" ON "cms_totp_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_users_email_uidx" ON "cms_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "cms_users_status_idx" ON "cms_users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_document_references_edge_uidx" ON "cms_document_references" USING btree ("source_document_id","target_document_id","relation");--> statement-breakpoint
CREATE INDEX "cms_document_references_target_idx" ON "cms_document_references" USING btree ("target_document_id");--> statement-breakpoint
CREATE INDEX "cms_document_terms_term_idx" ON "cms_document_terms" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_documents_canonical_slug_uidx" ON "cms_documents" USING btree ("canonical_slug");--> statement-breakpoint
CREATE INDEX "cms_documents_kind_status_idx" ON "cms_documents" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "cms_documents_owner_idx" ON "cms_documents" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_market_editions_document_market_uidx" ON "cms_market_editions" USING btree ("document_id","market");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_market_editions_market_slug_uidx" ON "cms_market_editions" USING btree ("market","localized_slug");--> statement-breakpoint
CREATE INDEX "cms_market_editions_release_idx" ON "cms_market_editions" USING btree ("publication_state","publish_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_media_assets_storage_key_uidx" ON "cms_media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "cms_media_assets_checksum_idx" ON "cms_media_assets" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "cms_media_assets_status_idx" ON "cms_media_assets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_media_references_location_uidx" ON "cms_media_references" USING btree ("document_id","field_path","asset_id");--> statement-breakpoint
CREATE INDEX "cms_media_references_asset_idx" ON "cms_media_references" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_revisions_edition_number_uidx" ON "cms_revisions" USING btree ("edition_id","revision_number");--> statement-breakpoint
CREATE INDEX "cms_revisions_edition_state_idx" ON "cms_revisions" USING btree ("edition_id","workflow_state");--> statement-breakpoint
CREATE INDEX "cms_revisions_digest_idx" ON "cms_revisions" USING btree ("content_digest");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_taxonomies_key_uidx" ON "cms_taxonomies" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_taxonomy_terms_taxonomy_slug_uidx" ON "cms_taxonomy_terms" USING btree ("taxonomy_id","slug");--> statement-breakpoint
CREATE INDEX "cms_taxonomy_terms_parent_idx" ON "cms_taxonomy_terms" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_audit_events_request_uidx" ON "cms_audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "cms_audit_events_target_time_idx" ON "cms_audit_events" USING btree ("target_type","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "cms_audit_events_actor_time_idx" ON "cms_audit_events" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "cms_audit_events_action_time_idx" ON "cms_audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "cms_operation_receipts_subject_idx" ON "cms_operation_receipts" USING btree ("operation","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_preview_sessions_token_uidx" ON "cms_preview_sessions" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "cms_preview_sessions_edition_expiry_idx" ON "cms_preview_sessions" USING btree ("edition_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_redirects_market_source_uidx" ON "cms_redirects" USING btree ("market","source_path");--> statement-breakpoint
CREATE INDEX "cms_redirects_active_idx" ON "cms_redirects" USING btree ("active_from","active_until");--> statement-breakpoint
CREATE INDEX "cms_submission_events_workflow_time_idx" ON "cms_submission_events" USING btree ("workflow_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_submission_workflows_source_uidx" ON "cms_submission_workflows" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "cms_submission_workflows_queue_idx" ON "cms_submission_workflows" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "cms_submission_workflows_assignee_idx" ON "cms_submission_workflows" USING btree ("assigned_to_user_id","status");--> statement-breakpoint
CREATE INDEX "cms_submission_workflows_deletion_idx" ON "cms_submission_workflows" USING btree ("deletion_due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_analytics_consents_subject_policy_uidx" ON "cms_analytics_consents" USING btree ("subject_digest","policy_version");--> statement-breakpoint
CREATE INDEX "cms_analytics_consents_subject_time_idx" ON "cms_analytics_consents" USING btree ("subject_digest","granted_at");--> statement-breakpoint
CREATE INDEX "cms_analytics_daily_event_day_idx" ON "cms_analytics_daily" USING btree ("event_name","day");--> statement-breakpoint
CREATE INDEX "cms_analytics_events_name_time_idx" ON "cms_analytics_events" USING btree ("event_name","occurred_at");--> statement-breakpoint
CREATE INDEX "cms_analytics_events_market_time_idx" ON "cms_analytics_events" USING btree ("market","occurred_at");--> statement-breakpoint
CREATE INDEX "cms_analytics_events_anonymous_time_idx" ON "cms_analytics_events" USING btree ("anonymous_id","occurred_at");