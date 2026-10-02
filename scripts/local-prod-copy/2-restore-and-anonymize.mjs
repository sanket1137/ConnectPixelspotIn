// STEP 2 (local only): load prod.dump into the LOCAL database from .env.localcopy, then replace
// every user's identity: new ids (remapped in every column that points at a user), fake
// names/emails/phones/firebase uids, and bank/GST/address/IP details wiped. Screens, zones and tags
// stay exactly as in production.
//   node scripts/local-prod-copy/2-restore-and-anonymize.mjs
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const pg = createRequire(path.join(root, "package.json"))("pg");

const envLine = fs.readFileSync(path.join(root, ".env.localcopy"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = envLine.slice("DATABASE_URL=".length).trim();
const u = new URL(url);
if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") throw new Error("Refusing: .env.localcopy must point at localhost");

const dump = path.join(here, "prod.dump");
if (!fs.existsSync(dump)) throw new Error("prod.dump not found — run step 1 first");

// 1. Restore (non-fatal errors such as Neon-only extensions are reported, not fatal)
const r = spawnSync(
  "C:/Program Files/PostgreSQL/17/bin/pg_restore.exe",
  ["--no-owner", "--no-acl", "--clean", "--if-exists", `--dbname=${u.pathname.slice(1)}`, dump],
  {
    env: { ...process.env, PGHOST: u.hostname, PGPORT: u.port || "5432", PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password), PGSSLMODE: "disable" },
    encoding: "utf8",
  }
);
const restoreErrors = (r.stderr || "").split(/\r?\n/).filter((l) => /error/i.test(l));
console.log(`pg_restore exit ${r.status}; ${restoreErrors.length} error lines`);
restoreErrors.slice(0, 15).forEach((l) => console.log("  ", l));

// 2. Anonymise
const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query("begin");

await c.query(`
  create temp table user_map as
  select id as old_id, gen_random_uuid()::text as new_id, row_number() over (order by created_at, id) as n, role
  from users`);
await c.query("create index on user_map(old_id)");

// Every text/varchar column (outside users.id) whose values point at a user
const cols = await c.query(`
  select c.table_name, c.column_name
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public' and c.data_type in ('character varying', 'text')
    and not (c.table_name = 'users' and c.column_name = 'id')`);
const remapped = [];
for (const { table_name, column_name } of cols.rows) {
  const t = `"${table_name}"`, col = `"${column_name}"`;
  const hit = await c.query(`select 1 from ${t} x join user_map m on x.${col} = m.old_id limit 1`);
  if (!hit.rowCount) continue;
  const res = await c.query(`update ${t} x set ${col} = m.new_id from user_map m where x.${col} = m.old_id`);
  remapped.push(`${table_name}.${column_name} (${res.rowCount})`);
}

await c.query(`
  update users x set
    id = m.new_id,
    firebase_uid = 'local-' || m.new_id,
    email = m.role || m.n || '@test.local',
    name = initcap(replace(m.role, '_', ' ')) || ' ' || m.n,
    phone = null,
    mobile_number = null,
    company_name = case when x.company_name is not null then 'Company ' || m.n end,
    brand_name   = case when x.brand_name   is not null then 'Brand ' || m.n end,
    agency_name  = case when x.agency_name  is not null then 'Agency ' || m.n end,
    gst_number = null, address = null,
    bank_account_name = null, bank_account_number = null, bank_ifsc_code = null, bank_name = null, upi_id = null,
    last_login_ip = null
  from user_map m where x.id = m.old_id`);

await c.query("commit");

const check = await c.query(`
  select count(*)::int users,
         count(*) filter (where email not like '%@test.local')::int real_emails_left,
         count(*) filter (where firebase_uid not like 'local-%')::int real_uids_left
  from users`);
const screens = await c.query("select count(*)::int n, count(*) filter (where status = 'active')::int active from screens");
await c.end();

console.log("Remapped user ids in:", remapped.join(", ") || "(none)");
console.log("Users:", check.rows[0]);
console.log("Screens:", screens.rows[0]);
