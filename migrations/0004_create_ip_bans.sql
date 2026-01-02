CREATE TABLE IF NOT EXISTS "ip_bans" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "ip_address" text NOT NULL UNIQUE,
  "ban_count" integer NOT NULL DEFAULT 1,
  "is_permanent" boolean NOT NULL DEFAULT false,
  "ban_code" varchar NOT NULL,
  "banned_until" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_bans_ip_address ON "ip_bans"("ip_address");
CREATE INDEX idx_ip_bans_is_permanent ON "ip_bans"("is_permanent");
