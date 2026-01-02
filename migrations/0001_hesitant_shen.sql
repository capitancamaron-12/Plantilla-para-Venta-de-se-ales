CREATE TABLE "cybertemp_subdomains" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subdomain" text NOT NULL,
	"domain" text NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temp_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"domain" text NOT NULL,
	"external_id" text,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_checked_at" timestamp DEFAULT now(),
	CONSTRAINT "temp_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"action" varchar(100) NOT NULL,
	"admin_id" varchar,
	"ip" varchar(45),
	"user_agent" text,
	"details" text,
	"success" varchar(10) DEFAULT 'true',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocked_ips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"reason" text NOT NULL,
	"blocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_slugs" ADD COLUMN "plain_slug" text NOT NULL;