// Venue-type backfill for the LOCAL database (.env.localcopy only — refuses anything not on localhost).
//
//   npx tsx scripts/venue/backfill-types.ts --dry-run   → report only, read-only session, writes nothing
//   npx tsx scripts/venue/backfill-types.ts --apply     → fills venue_type / environment_class / search_text
//                                                         (needs migrations/2026_09_venue_taxonomy.up.sql first)
//
// The dry run writes scripts/venue/reports/venue-types-dry-run.md for review.
import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";
import { buildSearchText, getVenueFamilyDef, resolveEnvironmentClass, resolveScreenVenueType } from "../../shared/venueTaxonomy";

const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--dry-run") ? "dry-run" : null;
if (!mode) {
  console.error("Usage: npx tsx scripts/venue/backfill-types.ts --dry-run | --apply");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envLine = fs.readFileSync(path.join(root, ".env.localcopy"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = envLine?.slice("DATABASE_URL=".length).trim() || "";
const host = new URL(url).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  console.error(`Refusing: .env.localcopy points at ${host}, not localhost.`);
  process.exit(1);
}

async function main() {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  if (mode === "dry-run") await c.query("set default_transaction_read_only = on");

  const { rows } = await c.query(
    `select id, status, venue_category, environment_type, venue_name, name, location, city, state, pincode, host from screens`
  );

  type Row = { raw: string; count: number; active: number; type?: string; family?: string; method?: string };
  const byRaw = new Map<string, Row>();
  const envCounts = new Map<string, { raw: string; cls: string; count: number }>();
  const updates: Array<{ id: string; venueType: string | null; envClass: string | null; searchText: string }> = [];

  for (const r of rows) {
    const raw = r.venue_category ?? "";
    const match = resolveScreenVenueType({ venueCategory: raw, venueName: r.venue_name, name: r.name });
    // rows resolved from their name are listed one by one (their category is empty)
    const key = match?.method === "name" ? `${raw}\u0000${r.venue_name}` : raw;
    const shown = match?.method === "name" ? `(empty) — venue "${r.venue_name}" / screen "${r.name}"` : raw;
    const row = byRaw.get(key) || { raw: shown, count: 0, active: 0, type: match?.type.slug, family: match ? getVenueFamilyDef(match.type.family)?.label : undefined, method: match?.method };
    row.count++;
    if (r.status === "active" || r.status === "approved") row.active++;
    byRaw.set(key, row);

    const envClass = resolveEnvironmentClass(r.environment_type, match?.type.slug);
    const envKey = `${r.environment_type ?? ""}${r.environment_type ? "" : ` (${match?.type.label ?? "no type"})`}`;
    const e = envCounts.get(envKey) || { raw: envKey, cls: envClass ?? "— (no match)", count: 0 };
    e.count++;
    envCounts.set(envKey, e);

    updates.push({
      id: r.id,
      venueType: match?.type.slug ?? null,
      envClass,
      searchText: buildSearchText({ venueName: r.venue_name, name: r.name, location: r.location, city: r.city, state: r.state, pincode: r.pincode, host: r.host, venueCategory: r.venue_category, venueType: match?.type.slug }),
    });
  }

  const all = Array.from(byRaw.values()).sort((a, b) => (a.family || "~").localeCompare(b.family || "~") || (a.type || "").localeCompare(b.type || "") || b.count - a.count);
  const matched = all.filter((r) => r.type);
  const unmatched = all.filter((r) => !r.type);
  const fuzzy = all.filter((r) => r.method === "contains" || r.method === "name");
  const total = rows.length;
  const matchedScreens = matched.reduce((s, r) => s + r.count, 0);

  const perType = new Map<string, { family: string; type: string; screens: number; rawValues: number }>();
  for (const r of matched) {
    const k = r.type!;
    const t = perType.get(k) || { family: r.family!, type: k, screens: 0, rawValues: 0 };
    t.screens += r.count;
    t.rawValues++;
    perType.set(k, t);
  }

  const esc = (s: string) => (s === "" ? "*(empty)*" : `\`${s.replace(/`/g, "'")}\``);
  const lines: string[] = [];
  lines.push(`# Venue type backfill — dry run`, ``);
  lines.push(`Generated ${new Date().toISOString()} from the local copy (\`${new URL(url).pathname.slice(1)}\`). Nothing was written.`, ``);
  lines.push(`- Screens: **${total}** · matched **${matchedScreens}** (${((matchedScreens / total) * 100).toFixed(1)}%) · unmatched **${total - matchedScreens}**`);
  lines.push(`- Distinct raw values: **${all.length}** · exact alias **${all.length - unmatched.length - fuzzy.length}** · matched by a word inside longer text **${fuzzy.length}** (please check these) · unmatched **${unmatched.length}**`, ``);

  lines.push(`## Needs your review`, ``);
  lines.push(`### Unmatched raw values (will stay without a type — screens still show, but not under any family filter)`, ``);
  lines.push(`| Raw venue_category | Screens |`, `|---|---:|`);
  unmatched.forEach((r) => lines.push(`| ${esc(r.raw)} | ${r.count} |`));
  if (!unmatched.length) lines.push(`| — none — | |`);
  lines.push(``, `### Not an exact alias — matched by a word inside longer text, or (empty category) from the venue/screen name`, ``);
  lines.push(`| Raw venue_category | → Type | Family | Screens |`, `|---|---|---|---:|`);
  fuzzy.forEach((r) => lines.push(`| ${esc(r.raw)} | ${r.type} | ${r.family} | ${r.count} |`));
  if (!fuzzy.length) lines.push(`| — none — | | | |`);

  lines.push(``, `## Screens per canonical type`, ``, `| Family | Type | Screens | Raw spellings |`, `|---|---|---:|---:|`);
  Array.from(perType.values())
    .sort((a, b) => a.family.localeCompare(b.family) || b.screens - a.screens)
    .forEach((t) => lines.push(`| ${t.family} | ${t.type} | ${t.screens} | ${t.rawValues} |`));

  lines.push(``, `## Every raw value → canonical type`, ``, `| Raw venue_category | → Type | Family | How | Screens (active) |`, `|---|---|---|---|---:|`);
  all.forEach((r) => lines.push(`| ${esc(r.raw)} | ${r.type ?? "**— unmatched —**"} | ${r.family ?? ""} | ${r.method ?? ""} | ${r.count} (${r.active}) |`));

  lines.push(``, `## Environment → class`, ``, `| Raw environment_type | → Class | Screens |`, `|---|---|---:|`);
  Array.from(envCounts.values()).sort((a, b) => b.count - a.count).forEach((e) => lines.push(`| ${esc(e.raw)} | ${e.cls} | ${e.count} |`));

  const outDir = path.join(root, "scripts", "venue", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "venue-types-dry-run.md");
  fs.writeFileSync(outFile, lines.join("\r\n") + "\r\n");

  console.log(`Screens ${total} · matched ${matchedScreens} · unmatched ${total - matchedScreens}`);
  console.log(`Raw values ${all.length} · fuzzy ${fuzzy.length} · unmatched ${unmatched.length}`);
  console.log(`Report: ${path.relative(root, outFile)}`);

  if (mode === "apply") {
    await c.query("begin");
    for (const u of updates) {
      await c.query("update screens set venue_type = $2, environment_class = $3, search_text = $4 where id = $1", [u.id, u.venueType, u.envClass, u.searchText]);
    }
    await c.query("commit");
    console.log(`Applied to ${updates.length} screens.`);
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
