// Venue-attribute backfill for the LOCAL database (.env.localcopy only — refuses anything not on localhost).
//
//   npx tsx scripts/venue/backfill-attributes.ts --dry-run   → report only, read-only session, writes nothing
//   npx tsx scripts/venue/backfill-attributes.ts --apply     → fills venue_attributes + footfall_note
//                                                             (needs migrations/2026_09_venue_attributes.up.sql)
//
// Report: scripts/venue/reports/venue-attributes-dry-run.md
import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";
import { attributesFor, deriveMetrics, formatAttributeValue, type VenueAttributes } from "../../shared/venueAttributes";
import { getVenueType } from "../../shared/venueTaxonomy";
import { footfallIsEstimate, parseAttributes } from "./parse-attributes";

const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--dry-run") ? "dry-run" : null;
if (!mode) {
  console.error("Usage: npx tsx scripts/venue/backfill-attributes.ts --dry-run | --apply");
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

// Placeholder footfall: one value repeated on many listings of the same network across several
// kinds of venue — a template default, not a measurement. Hidden (the venue's own metrics still show).
const PLACEHOLDER_MIN_LISTINGS = 50;
const PLACEHOLDER_MIN_TYPES = 3;

async function main() {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  if (mode === "dry-run") await c.query("set default_transaction_read_only = on");

  const { rows } = await c.query(
    `select id, host, venue_type, venue_name, name, description, size, avg_daily_footfall, status from screens`
  );

  // Find placeholder (host, footfall) combinations
  const combos = new Map<string, { host: string; footfall: number; listings: number; types: Set<string> }>();
  for (const r of rows) {
    if (!r.avg_daily_footfall) continue;
    const k = `${r.host}|${r.avg_daily_footfall}`;
    const e = combos.get(k) || { host: r.host ?? "(none)", footfall: r.avg_daily_footfall, listings: 0, types: new Set<string>() };
    e.listings++;
    e.types.add(r.venue_type ?? "(none)");
    combos.set(k, e);
  }
  const placeholders = Array.from(combos.values()).filter((e) => e.listings >= PLACEHOLDER_MIN_LISTINGS && e.types.size >= PLACEHOLDER_MIN_TYPES);
  const placeholderKeys = new Set(placeholders.map((e) => `${e.host}|${e.footfall}`));

  const fill = new Map<string, Map<string, number>>(); // type → key → count
  const sourceCounts = new Map<string, number>();
  const typeTotals = new Map<string, number>();
  const notes = { hidden: 0, estimate: 0, none: 0 };
  const samples: Array<{ type: string; desc: string; parsed: string; derived: string }> = [];
  const updates: Array<{ id: string; attrs: VenueAttributes; note: string | null }> = [];

  for (const r of rows) {
    const type = r.venue_type as string | null;
    typeTotals.set(type ?? "(none)", (typeTotals.get(type ?? "(none)") || 0) + 1);
    const { attrs, sources } = parseAttributes(type, r.description, r.size);
    const note = r.avg_daily_footfall && placeholderKeys.has(`${r.host ?? "(none)"}|${r.avg_daily_footfall}`)
      ? "hidden"
      : footfallIsEstimate(r.description) ? "estimate" : null;
    notes[(note ?? "none") as keyof typeof notes]++;
    updates.push({ id: r.id, attrs, note });

    for (const [k, src] of Object.entries(sources)) {
      const t = fill.get(type ?? "(none)") || new Map<string, number>();
      t.set(k, (t.get(k) || 0) + 1);
      fill.set(type ?? "(none)", t);
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
    }
    if (Object.keys(attrs).length) {
      const defs = attributesFor(type);
      samples.push({
        type: type ?? "(none)",
        desc: (r.description || "").replace(/\s+/g, " ").slice(0, 170),
        parsed: defs.filter((d) => attrs[d.key] !== undefined).map((d) => `${d.label}: ${formatAttributeValue(d, attrs[d.key])}`).join(" · "),
        derived: deriveMetrics(type, attrs).map((m) => `${m.label} (Est.): ${m.value}`).join(" · "),
      });
    }
  }

  // 20 random samples, spread across types
  const byType = new Map<string, typeof samples>();
  for (const s of samples) byType.set(s.type, [...(byType.get(s.type) || []), s]);
  const picked: typeof samples = [];
  const types = Array.from(byType.keys());
  let i = 0;
  while (picked.length < 20 && types.some((t) => byType.get(t)!.length)) {
    const list = byType.get(types[i % types.length])!;
    if (list.length) picked.push(list.splice(Math.floor(Math.random() * list.length), 1)[0]);
    i++;
  }

  const L: string[] = [];
  const cell = (s: string) => s.replace(/\|/g, "/");
  L.push(`# Venue attributes backfill — dry run`, ``);
  L.push(`Generated ${new Date().toISOString()} from the local copy. Nothing was written. Only numbers the description (or the size column) states explicitly are taken.`, ``);
  L.push(`- Screens: **${rows.length}** · with at least one attribute: **${updates.filter((u) => Object.keys(u.attrs).length).length}**`);
  L.push(`- Footfall: hidden as placeholder **${notes.hidden}** · marked "Est." **${notes.estimate}** · shown as-is **${notes.none}**`, ``);

  L.push(`## Needs your review`, ``);
  L.push(`### Placeholder footfall (hidden on cards/details; excluded from "Best value" and footfall sort)`, ``);
  L.push(`Rule: the same value on ≥ ${PLACEHOLDER_MIN_LISTINGS} listings of one network across ≥ ${PLACEHOLDER_MIN_TYPES} venue types.`, ``);
  L.push(`| Network | Footfall value | Listings | Venue types |`, `|---|---:|---:|---:|`);
  placeholders.forEach((p) => L.push(`| ${p.host} | ${p.footfall} | ${p.listings} | ${p.types.size} |`));
  if (!placeholders.length) L.push(`| — none — | | | |`);

  L.push(``, `### "Property value up to ₹X" — a maximum, stored as average flat value`, ``);
  L.push(`${sourceCounts.get("“Property value up to ₹X Cr” (a maximum, not an average)") || 0} screens. Keep (affluence tier will read slightly high), or skip these?`, ``);

  L.push(`## What each description pattern filled`, ``, `| Pattern | Screens |`, `|---|---:|`);
  Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => L.push(`| ${s} | ${n} |`));

  L.push(``, `## Fill rate per venue type`, ``, `| Type | Screens | Attribute → filled |`, `|---|---:|---|`);
  Array.from(fill.entries())
    .sort((a, b) => (typeTotals.get(b[0]) || 0) - (typeTotals.get(a[0]) || 0))
    .forEach(([t, m]) => {
      const label = getVenueType(t)?.label ?? t;
      const defs = attributesFor(t);
      const parts = Array.from(m.entries()).map(([k, n]) => `${defs.find((d) => d.key === k)?.label ?? k} ${n}`);
      L.push(`| ${label} | ${typeTotals.get(t)} | ${parts.join(" · ")} |`);
    });

  L.push(``, `## 20 random samples`, ``, `| Type | Description (start) | Parsed | Derived |`, `|---|---|---|---|`);
  picked.forEach((s) => L.push(`| ${getVenueType(s.type)?.label ?? s.type} | ${cell(s.desc)}… | ${cell(s.parsed)} | ${cell(s.derived) || "—"} |`));

  const outDir = path.join(root, "scripts", "venue", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "venue-attributes-dry-run.md");
  fs.writeFileSync(outFile, L.join("\r\n") + "\r\n");

  console.log(`Screens ${rows.length} · with attributes ${updates.filter((u) => Object.keys(u.attrs).length).length}`);
  console.log(`Footfall hidden ${notes.hidden} · estimate ${notes.estimate} · as-is ${notes.none}`);
  console.log(`Report: ${path.relative(root, outFile)}`);

  if (mode === "apply") {
    await c.query("begin");
    for (const u of updates) {
      // merge: values already stored (typed by owners in the form) win over parsed ones — re-running is safe
      await c.query("update screens set venue_attributes = $2::jsonb || coalesce(venue_attributes, '{}'::jsonb), footfall_note = $3 where id = $1", [u.id, JSON.stringify(u.attrs), u.note]);
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
