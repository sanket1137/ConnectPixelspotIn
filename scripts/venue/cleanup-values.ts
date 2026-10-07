// Cleans free-typed screen values onto the form's fixed option lists (LOCAL database only — refuses anything not on localhost).
//
//   npx tsx scripts/venue/cleanup-values.ts --dry-run          → report only, read-only session, writes nothing
//   npx tsx scripts/venue/cleanup-values.ts --apply            → applies, saves a backup of every changed value first
//   npx tsx scripts/venue/cleanup-values.ts --undo <backup>    → restores the values from a backup file
//
// Mapping = the proposals in scripts/venue/reports/data-cleanup-review.xlsx (all accepted).
// Not applied (listed in the report for a decision): values with no matching option on single-value columns
// (e.g. display format "Mixed", blank environment/traffic), and list changes that would leave a required list empty.
import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";
import { buildSearchText, resolveEnvironmentClass } from "../../shared/venueTaxonomy";
import { DETAILED_AGE_GROUPS, GENDER_ORIENTATIONS, INCOME_LEVELS, INDIAN_STATES, VISIBILITY_LEVELS } from "../../shared/constants";

const args = process.argv.slice(2);
const mode = args.includes("--apply") ? "apply" : args.includes("--undo") ? "undo" : args.includes("--dry-run") ? "dry-run" : null;
if (!mode) {
  console.error("Usage: npx tsx scripts/venue/cleanup-values.ts --dry-run | --apply | --undo <backup.json>");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envLine = fs.readFileSync(path.join(root, ".env.localcopy"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = envLine?.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "") || "";
const dbHost = new URL(url).hostname;
if (dbHost !== "localhost" && dbHost !== "127.0.0.1") {
  console.error(`Refusing: .env.localcopy points at ${dbHost}, not localhost.`);
  process.exit(1);
}
const reportDir = path.join(root, "scripts", "venue", "reports");

// Fixed lists = the screen form's options
const ALLOWED: Record<string, readonly string[]> = {
  category: ["Digital Display", "LED Video Wall", "Kiosk", "Mall LED", "Lift Display", "Transit Display"],
  display_format: ["Portrait", "Landscape", "Square"],
  environment_type: ["Indoor", "Semi-Outdoor", "Outdoor Digital"],
  traffic_type: ["Pedestrian", "Seated Audience", "Transit", "Mixed"],
  visibility: VISIBILITY_LEVELS,
  gender_orientation: GENDER_ORIENTATIONS,
  income_level: INCOME_LEVELS,
  time_of_day_activity: ["Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"],
  content_types_supported: ["Static Image", "Video", "Interactive", "HTML5"],
  user_intent: ["Shopping", "Commuting", "Dining", "Fitness", "Entertainment", "Work", "Education"],
  user_mood: ["Relaxed", "Rushed", "Social", "Focused", "Leisure"],
  occupation_mix: ["Students", "Working Professionals", "Business Owners", "Homemakers"],
  detailed_age_groups: DETAILED_AGE_GROUPS,
  custom_operating_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  state: INDIAN_STATES,
};
const REQUIRED_SCALAR = new Set(["category", "display_format", "environment_type", "traffic_type"]);
const REQUIRED_LIST = new Set(["time_of_day_activity", "content_types_supported", "user_intent", "user_mood", "occupation_mix"]);
const SCALAR_COLS = ["category", "display_format", "environment_type", "traffic_type", "visibility", "gender_orientation", "income_level"];
const LIST_COLS = ["time_of_day_activity", "content_types_supported", "user_intent", "user_mood", "occupation_mix", "detailed_age_groups", "custom_operating_days"];
const REMOVE = null; // list item with no matching option → dropped

const MAP: Record<string, Record<string, string | null>> = {
  category: { "Digital Screen": "Digital Display", "LED Display": "LED Video Wall", "Outdoor LED": "LED Video Wall", "Digital Billboard": "LED Video Wall", "Digital Standee": "Kiosk" },
  environment_type: { Outdoor: "Outdoor Digital" },
  traffic_type: { "Foot Traffic": "Pedestrian", "Captive Residents": "Pedestrian", Vehicular: "Transit", "Vehicular Traffic": "Transit" },
  income_level: {
    "Middle Class": "Middle Income", Premium: "Premium Audience", "Middle-High Income": "Premium Audience", "Middle to Premium": "Premium Audience",
    "Upper Middle Income": "Premium Audience", "Upper Middle Class": "Premium Audience", "Upper Middle": "Premium Audience", "High Income": "Premium Audience",
  },
  time_of_day_activity: { Evening: "Evening Leisure", Morning: "Morning Rush", Afternoon: "Lunch Hours", "Afternoon Leisure": "Lunch Hours", Overnight: "Late Night" },
  content_types_supported: { MP4: "Video", MPEG: "Video", GIF: "Video", JPEG: "Static Image", "JPEG/PNG": "Static Image", Image: "Static Image" },
  user_intent: {
    Commute: "Commuting", Grocery: "Shopping", "Daily Essentials": "Shopping", Household: "Shopping", Payment: "Shopping", Lifestyle: "Shopping",
    Movies: "Entertainment", Leisure: "Entertainment", Play: "Entertainment", Travel: "Commuting", Business: "Work", Networking: "Work",
    "Professional Services": "Work", Health: "Fitness", Wellness: "Fitness", "Home Life": REMOVE, Family: REMOVE, "Daily Living": REMOVE,
  },
  user_mood: {
    Routine: "Focused", Engaged: "Focused", Professional: "Focused", Purposeful: "Focused", "Task-Oriented": "Focused", Motivated: "Focused",
    Excited: "Social", Energetic: "Social", Happy: "Social", Entertained: "Leisure", Curious: "Leisure", Casual: "Relaxed", Patient: "Relaxed", Hungry: REMOVE,
  },
  occupation_mix: {
    Executives: "Working Professionals", "Corporate Professionals": "Working Professionals", "IT Professionals": "Working Professionals",
    "Decision Makers": "Working Professionals", "Young Adults": "Students", Youth: "Students", Parents: "Homemakers",
  },
  detailed_age_groups: { "Seniors (56+)": "Seniors (55+)", "18-25": "Young Adults (18-25)", "26-40": "Adults (26-40)", "41-55": "Middle Age (41-55)" },
  custom_operating_days: { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" },
};

const CITY_MAP: Record<string, string> = {
  Bangalore: "Bengaluru", "Bengaluru Urban": "Bengaluru", "Bengaluru Rural": "Bengaluru", Gurgaon: "Gurugram", Pondicherry: "Puducherry",
  Allahabad: "Prayagraj", Gulbarga: "Kalaburagi", Kalburgi: "Kalaburagi", Bellari: "Ballari", HISSAR: "Hisar", Navasari: "Navsari",
  Delhi: "New Delhi", "Delhi - South": "New Delhi", "Delhi - West": "New Delhi", "Delhi - Central": "New Delhi",
  "Udaipur - RAJ": "Udaipur", "Bilaspur - CG": "Bilaspur", Aurangabad: "Chhatrapati Sambhajinagar", Khdidarpur: "Khidirpur",
};
const STATE_FIX: Record<string, string> = { TamilNadu: "Tamil Nadu", "J&K": "Jammu and Kashmir", "Jammu & Kashmir": "Jammu and Kashmir" };
// cities whose state is certain (fixes "Delhi-NCR", "South", and swapped Chandigarh/Mohali)
const CITY_STATE: Record<string, string> = {
  Gurugram: "Haryana", Faridabad: "Haryana", Panchkula: "Haryana", Noida: "Uttar Pradesh", "Greater Noida": "Uttar Pradesh", Ghaziabad: "Uttar Pradesh",
  "New Delhi": "Delhi", Chandigarh: "Chandigarh", Mohali: "Punjab", Zirakpur: "Punjab", Bengaluru: "Karnataka",
};

const caseMatch = (col: string, v: string) => ALLOWED[col].find((a) => a.toLowerCase() === v.trim().toLowerCase());

function cleanCity(c: string | null): string | null {
  if (c == null) return c;
  if (CITY_MAP[c]) return CITY_MAP[c];
  const t = c.trim().replace(/\s+/g, " ");
  if (t.length > 3 && t === t.toUpperCase()) return t.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
  return t;
}

type Change = { col: string; before: unknown; after: unknown };
type Skip = { id: string; host: string | null; venue: string; name: string; col: string; value: unknown; reason: string };

async function main() {
  const c = new pg.Client({ connectionString: url });
  await c.connect();

  if (mode === "undo") {
    const file = args[args.indexOf("--undo") + 1];
    const backup: Array<{ id: string; values: Record<string, unknown> }> = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    await c.query("begin");
    for (const b of backup) {
      const cols = Object.keys(b.values);
      await c.query(`update screens set ${cols.map((k, i) => `${k} = $${i + 2}`).join(", ")} where id = $1`, [b.id, ...cols.map((k) => b.values[k])]);
    }
    await c.query("commit");
    console.log(`Restored ${backup.length} screens. Re-run: npx tsx scripts/venue/backfill-types.ts --apply  (to rebuild search_text)`);
    await c.end();
    return;
  }

  if (mode === "dry-run") await c.query("set default_transaction_read_only = on");
  const { rows } = await c.query(
    `select id, host, name, venue_name, location, city, state, pincode, venue_category, venue_type, environment_class, search_text,
            ${[...SCALAR_COLS, ...LIST_COLS].join(", ")} from screens order by host nulls last, venue_name, name`
  );

  const updates: Array<{ id: string; set: Record<string, unknown>; before: Record<string, unknown>; changes: Change[] }> = [];
  const skips: Skip[] = [];
  const tally = new Map<string, number>(); // "col | before → after" → screens

  for (const r of rows) {
    const set: Record<string, unknown> = {};
    const changes: Change[] = [];
    const skip = (col: string, value: unknown, reason: string) =>
      skips.push({ id: r.id, host: r.host, venue: r.venue_name, name: r.name, col, value, reason });
    const note = (col: string, before: unknown, after: unknown, label?: string) => {
      set[col] = after;
      changes.push({ col, before, after });
      const k = `${col} | ${label ?? `${before ?? "(empty)"} → ${after ?? "(empty)"}`}`;
      tally.set(k, (tally.get(k) || 0) + 1);
    };

    // single-value columns
    for (const col of SCALAR_COLS) {
      const v: string | null = r[col];
      if (v == null || v === "") {
        if (REQUIRED_SCALAR.has(col)) skip(col, v, "missing — required, needs a value");
        else if (v === "") note(col, v, null);
        continue;
      }
      if (ALLOWED[col].includes(v)) continue;
      const to = MAP[col]?.[v] ?? caseMatch(col, v);
      if (to) note(col, v, to);
      else skip(col, v, "no matching option");
    }

    // list columns
    for (const col of LIST_COLS) {
      const list: string[] = r[col] || [];
      if (!list.length || list.every((x) => ALLOWED[col].includes(x))) continue;
      const out: string[] = [];
      const labels: string[] = [];
      for (const it of list) {
        if (ALLOWED[col].includes(it)) { if (!out.includes(it)) out.push(it); continue; }
        const mapped = it in (MAP[col] || {}) ? MAP[col][it] : caseMatch(col, it) ?? REMOVE;
        labels.push(`${it} → ${mapped ?? "(removed)"}`);
        if (mapped && !out.includes(mapped)) out.push(mapped);
      }
      if (col === "custom_operating_days") out.sort((a, b) => ALLOWED[col].indexOf(a) - ALLOWED[col].indexOf(b));
      if (!out.length && REQUIRED_LIST.has(col)) { skip(col, list.join(", "), "every item has no matching option — list would be empty"); continue; }
      set[col] = out;
      changes.push({ col, before: list, after: out });
      for (const l of labels) tally.set(`${col} | ${l}`, (tally.get(`${col} | ${l}`) || 0) + 1);
    }

    // city, then state (state uses the cleaned city)
    const city = cleanCity(r.city);
    if (city !== r.city) note("city", r.city, city);
    let state: string | null = r.state;
    if (state && STATE_FIX[state]) state = STATE_FIX[state];
    const certain = city ? CITY_STATE[city] : undefined;
    if (certain && state !== certain) state = certain;
    if (state && !INDIAN_STATES.includes(state)) skip("state", r.state, `not a state and city "${city}" has no known state`);
    else if (state !== r.state) note("state", r.state, state, `${r.state} → ${state}${STATE_FIX[r.state] ? "" : ` (city ${city})`}`);

    if (!changes.length) continue;

    // keep derived columns in step with the cleaned values
    const merged = { ...r, ...set };
    const envClass = resolveEnvironmentClass(merged.environment_type, merged.venue_type);
    if (envClass !== r.environment_class) set.environment_class = envClass;
    const searchText = buildSearchText({
      venueName: merged.venue_name, name: merged.name, location: merged.location, city: merged.city, state: merged.state,
      pincode: merged.pincode, host: merged.host, venueCategory: merged.venue_category, venueType: merged.venue_type,
    });
    if (searchText !== r.search_text) set.search_text = searchText;

    const before: Record<string, unknown> = {};
    for (const k of Object.keys(set)) before[k] = r[k];
    updates.push({ id: r.id, set, before, changes });
  }

  // ── report ──
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const L: string[] = [];
  const esc = (v: unknown) => (v == null || v === "" ? "*(empty)*" : String(Array.isArray(v) ? v.join(", ") : v).replace(/\|/g, "/"));
  L.push(`# Value cleanup — ${mode === "apply" ? "APPLIED" : "dry run"}`, ``);
  L.push(`Generated ${new Date().toISOString()} on the local copy (\`${new URL(url).pathname.slice(1)}\`).${mode === "apply" ? "" : " Nothing was written."}`, ``);
  L.push(`- Screens checked: **${rows.length}** · screens changed: **${updates.length}** · values left for your decision: **${skips.length}**`, ``);
  L.push(`## Changes by value`, ``, `| Column | Change | Screens |`, `|---|---|---:|`);
  Array.from(tally.entries())
    .sort((a, b) => a[0].localeCompare(b[0]) || b[1] - a[1])
    .forEach(([k, n]) => { const [col, ch] = k.split(" | "); L.push(`| ${col} | ${esc(ch)} | ${n} |`); });
  L.push(``, `## Not changed — needs your decision`, ``, `| Screen id | Host | Venue | Screen | Column | Value | Why |`, `|---|---|---|---|---|---|---|`);
  skips.forEach((s) => L.push(`| ${s.id} | ${s.host ?? ""} | ${esc(s.venue)} | ${esc(s.name)} | ${s.col} | ${esc(s.value)} | ${s.reason} |`));
  if (!skips.length) L.push(`| — none — | | | | | | |`);
  L.push(``, `## Every changed screen (before → after)`, ``, `| Screen id | Host | Venue | Screen | Column | Before | After |`, `|---|---|---|---|---|---|---|`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const u of updates) {
    const r = byId.get(u.id);
    for (const ch of u.changes) L.push(`| ${u.id} | ${r.host ?? ""} | ${esc(r.venue_name)} | ${esc(r.name)} | ${ch.col} | ${esc(ch.before)} | ${esc(ch.after)} |`);
  }
  fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, mode === "apply" ? `value-cleanup-applied-${stamp}.md` : "value-cleanup-dry-run.md");
  fs.writeFileSync(reportFile, L.join("\r\n") + "\r\n");
  console.log(`Screens ${rows.length} · changed ${updates.length} · left for decision ${skips.length}`);
  console.log(`Report: ${path.relative(root, reportFile)}`);

  if (mode === "apply") {
    const backupFile = path.join(reportDir, `value-cleanup-backup-${stamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(updates.map((u) => ({ id: u.id, values: u.before }))));
    console.log(`Backup: ${path.relative(root, backupFile)}  (undo: npx tsx scripts/venue/cleanup-values.ts --undo ${path.relative(root, backupFile)})`);
    await c.query("begin");
    for (const u of updates) {
      const cols = Object.keys(u.set);
      await c.query(`update screens set ${cols.map((k, i) => `${k} = $${i + 2}`).join(", ")} where id = $1`, [u.id, ...cols.map((k) => u.set[k])]);
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
