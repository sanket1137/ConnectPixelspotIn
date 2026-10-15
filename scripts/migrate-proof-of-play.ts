import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating proof_of_play table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS proof_of_play (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id varchar NOT NULL,
        campaign_id varchar NOT NULL,
        screen_id varchar NOT NULL,
        owner_id varchar NOT NULL,
        uploaded_by varchar,
        uploaded_by_role text NOT NULL DEFAULT 'screen_owner',
        file_urls jsonb NOT NULL,
        summary text,
        owner_notes text,
        admin_verified boolean NOT NULL DEFAULT false,
        admin_verified_by varchar,
        admin_verified_at timestamp,
        admin_notes text,
        advertiser_confirmed boolean NOT NULL DEFAULT false,
        advertiser_confirmed_at timestamp,
        advertiser_notes text,
        status text NOT NULL DEFAULT 'pending',
        cleanup_eligible_at timestamp,
        cleanup_status text DEFAULT 'active',
        cleaned_up_at timestamp,
        cleaned_up_by varchar,
        snoozed_until timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS uploaded_by varchar;
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS uploaded_by_role text NOT NULL DEFAULT 'screen_owner';
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS summary text;
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS cleanup_eligible_at timestamp;
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS cleanup_status text DEFAULT 'active';
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS cleaned_up_at timestamp;
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS cleaned_up_by varchar;
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS snoozed_until timestamp;
      ALTER TABLE proof_of_play ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_proof_of_play_booking_id ON proof_of_play (booking_id);
      CREATE INDEX IF NOT EXISTS idx_proof_of_play_campaign_id ON proof_of_play (campaign_id);
      CREATE INDEX IF NOT EXISTS idx_proof_of_play_owner_id ON proof_of_play (owner_id);
      CREATE INDEX IF NOT EXISTS idx_proof_of_play_status ON proof_of_play (status);
      CREATE INDEX IF NOT EXISTS idx_proof_of_play_cleanup_eligible ON proof_of_play (cleanup_eligible_at, cleanup_status);
    `);

    console.log("✅ proof_of_play migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    process.exit(0);
  }
}

main();
