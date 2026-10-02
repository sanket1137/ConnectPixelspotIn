// STEP 0 (local only): create role pixelspot_local + empty database connectpixelspot_prodcopy on
// localhost, and write .env.localcopy (= .env.development with DATABASE_URL pointed at it).
// Needs LOCAL_PG_ADMIN_URL = a localhost superuser URL, e.g. postgresql://postgres:<pw>@localhost:5432/postgres
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const pg = createRequire(path.join(root, "package.json"))("pg");

const admin = process.env.LOCAL_PG_ADMIN_URL;
if (!admin || !/@localhost[:/]/.test(admin)) throw new Error("Set LOCAL_PG_ADMIN_URL to a localhost superuser URL");

const DB = "connectpixelspot_prodcopy";
const ROLE = "pixelspot_local";
const password = crypto.randomBytes(18).toString("base64url");

const c = new pg.Client({ connectionString: admin });
await c.connect();
const role = await c.query("select 1 from pg_roles where rolname = $1", [ROLE]);
await c.query(`${role.rowCount ? "alter" : "create"} role ${ROLE} login password '${password}'`);
const db = await c.query("select 1 from pg_database where datname = $1", [DB]);
if (db.rowCount) {
  await c.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${DB}'`);
  await c.query(`drop database ${DB}`);
}
await c.query(`create database ${DB} owner ${ROLE}`);
await c.end();

const devEnv = fs.readFileSync(path.join(root, ".env.development"), "utf8").split(/\r?\n/).filter((l) => !l.startsWith("DATABASE_URL="));
fs.writeFileSync(
  path.join(root, ".env.localcopy"),
  [
    "# Local copy of production (anonymised users). Everything else = .env.development.",
    `DATABASE_URL=postgresql://${ROLE}:${password}@localhost:5432/${DB}?sslmode=disable`,
    ...devEnv,
  ].join("\n")
);
console.log(`Created empty ${DB} owned by ${ROLE}; wrote .env.localcopy`);
