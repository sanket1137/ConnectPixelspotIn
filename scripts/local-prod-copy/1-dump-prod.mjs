// STEP 1 (run it yourself): READ-ONLY export of production into scripts/local-prod-copy/prod.dump
//   node scripts/local-prod-copy/1-dump-prod.mjs
//
// pg_dump only runs SELECTs, and the session is also forced read-only via PGOPTIONS, so this
// cannot change production. Sensitive tables are exported as structure only (no rows).
// The connection string comes from .env.production and is never printed.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outFile = path.join(here, "prod.dump");

const line = fs.readFileSync(path.join(root, ".env.production"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
if (!line) throw new Error("DATABASE_URL not found in .env.production");
const u = new URL(line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "").replace("-pooler.", "."));

const noData = [
  "payments", "owner_payouts", "invoices", "otps", "password_reset_tokens", "notifications",
  "support_tickets", "ticket_messages", "ai_conversations", "ai_messages", "ai_rate_limits",
  "session", "sessions", "user_sessions", "audit_logs",
];
const args = ["--format=custom", "--no-owner", "--no-acl", `--file=${outFile}`];
for (const t of noData) args.push(`--exclude-table-data=public.${t}`);

const r = spawnSync("C:/Program Files/PostgreSQL/17/bin/pg_dump.exe", args, {
  env: {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: u.pathname.slice(1),
    PGSSLMODE: "require",
    PGOPTIONS: "-c default_transaction_read_only=on",
  },
  encoding: "utf8",
  stdio: ["ignore", "inherit", "pipe"],
});
if (r.stderr) console.error(r.stderr.replaceAll(decodeURIComponent(u.password), "***"));
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`Done: ${outFile} (${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB). Now tell Claude to run step 2.`);
