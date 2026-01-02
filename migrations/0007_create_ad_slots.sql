CREATE TABLE IF NOT EXISTS "ad_slots" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "slot" varchar NOT NULL UNIQUE,
  "html" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
