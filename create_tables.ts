import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Creating support_tickets table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        subject text NOT NULL,
        category text NOT NULL,
        priority text NOT NULL DEFAULT 'medium',
        status text NOT NULL DEFAULT 'open',
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log("Creating ticket_messages table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL REFERENCES support_tickets(id),
        sender_id uuid NOT NULL,
        message text NOT NULL,
        attachments jsonb,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log("Adding invoices constraint...");
    try {
      await db.execute(sql`
        ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);
      `);
      console.log("Invoices constraint added.");
    } catch (e: any) {
      console.log("Invoices constraint already exists or error:", e.message);
    }

    console.log("Success!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
}

main();
