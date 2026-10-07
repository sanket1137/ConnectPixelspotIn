// Venue metric definitions, city master and the admin Excel screen import.
// Registered in routes.ts via registerScreenImportRoutes().
import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { and, desc, eq, inArray } from "drizzle-orm";
import { screenImports, users } from "@shared/schema";
import { SCREEN_STATUSES } from "@shared/screenFieldOptions";
import { summarize, validateRows, type ImportRow } from "@shared/screenImport";
import { getVenueType } from "@shared/venueTaxonomy";
import { db } from "./db";
import { buildContext, buildTemplate, checkDraft, commitImport, normalizeRows, parseUpload } from "./screenImportService";
import {
  addCity,
  createMetric,
  getCityMaster,
  getMetricRegistry,
  getPublicMetricRegistry,
  metricUsage,
  updateMetric,
} from "./venueMetricDefinitions";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.xlsx$/i.test(file.originalname)),
});

type Mw = (req: Request, res: Response, next: NextFunction) => void;

export function registerScreenImportRoutes(app: Express, authenticate: Mw, requireRole: (...roles: string[]) => Mw) {
  const admin = [authenticate, requireRole("admin")];

  // ---------- metric definitions ----------

  // Active definitions for every venue type (labels/units for advertiser views and forms)
  app.get("/api/venue-metrics/definitions", async (_req, res) => {
    try {
      res.set("Cache-Control", "public, max-age=60");
      res.json({ registry: await getPublicMetricRegistry() });
    } catch (e) {
      console.error("venue metric definitions:", e);
      res.status(500).json({ error: "Failed to load venue metrics" });
    }
  });

  app.get("/api/admin/venue-metrics", ...admin, async (req, res) => {
    try {
      const venueType = String(req.query.venueType || "");
      if (!getVenueType(venueType)) return res.status(400).json({ error: "Pick a venue category" });
      const [registry, usage] = await Promise.all([getMetricRegistry(), metricUsage(venueType)]);
      res.json({ metrics: (registry[venueType] || []).slice().sort((a, b) => a.sortOrder - b.sortOrder), usage });
    } catch (e) {
      console.error("admin venue metrics:", e);
      res.status(500).json({ error: "Failed to load metrics" });
    }
  });

  app.post("/api/admin/venue-metrics", ...admin, async (req, res) => {
    try {
      const { venueType, ...input } = req.body || {};
      const out = await createMetric(String(venueType || ""), input, req.user!.id);
      if ("error" in out) return res.status(400).json({ error: out.error });
      res.status(201).json(out.metric);
    } catch (e: any) {
      if (e?.code === "42P01") return res.status(503).json({ error: "Run the venue metrics migration first" });
      console.error("create venue metric:", e);
      res.status(500).json({ error: "Failed to add metric" });
    }
  });

  app.patch("/api/admin/venue-metrics/:id", ...admin, async (req, res) => {
    try {
      const out = await updateMetric(parseInt(req.params.id, 10), req.body || {});
      if ("error" in out) return res.status((out as any).status || 400).json({ error: out.error });
      res.json(out.metric);
    } catch (e) {
      console.error("update venue metric:", e);
      res.status(500).json({ error: "Failed to update metric" });
    }
  });

  // ---------- cities ----------

  app.get("/api/admin/cities", ...admin, async (_req, res) => {
    try {
      res.json({ cities: await getCityMaster() });
    } catch (e) {
      console.error("cities:", e);
      res.status(500).json({ error: "Failed to load cities" });
    }
  });

  app.post("/api/admin/cities", ...admin, async (req, res) => {
    try {
      const out = await addCity(String(req.body?.state || ""), String(req.body?.city || ""), req.user!.id);
      if ("error" in out) return res.status(400).json({ error: out.error });
      res.status(201).json(out);
    } catch (e) {
      console.error("add city:", e);
      res.status(500).json({ error: "Failed to add city" });
    }
  });

  // ---------- template ----------

  app.get("/api/admin/screen-imports/template", ...admin, async (req, res) => {
    try {
      const venueType = String(req.query.venueType || "");
      const vt = getVenueType(venueType);
      if (!vt) return res.status(400).json({ error: "Pick a venue category" });
      const buf = await buildTemplate(venueType);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="PixelSpot_${vt.label.replace(/[^A-Za-z0-9]+/g, "_")}_template.xlsx"`);
      res.send(buf);
    } catch (e) {
      console.error("import template:", e);
      res.status(500).json({ error: "Failed to build the template" });
    }
  });

  // ---------- imports ----------

  const ownerOk = async (ownerId: string) => {
    const [u] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, ownerId));
    return !!u && u.role === "screen_owner";
  };

  // Drafts and recent imports (without rows)
  app.get("/api/admin/screen-imports", ...admin, async (_req, res) => {
    try {
      const list = await db
        .select({
          id: screenImports.id,
          fileName: screenImports.fileName,
          venueType: screenImports.venueType,
          ownerId: screenImports.ownerId,
          host: screenImports.host,
          screenStatus: screenImports.screenStatus,
          state: screenImports.state,
          errorCount: screenImports.errorCount,
          screenCount: screenImports.screenCount,
          createdBy: screenImports.createdBy,
          updatedBy: screenImports.updatedBy,
          createdAt: screenImports.createdAt,
          updatedAt: screenImports.updatedAt,
          importedAt: screenImports.importedAt,
        })
        .from(screenImports)
        .where(inArray(screenImports.state, ["draft", "imported"]))
        .orderBy(desc(screenImports.updatedAt))
        .limit(100);
      const ids = Array.from(new Set(list.flatMap((l) => [l.ownerId, l.createdBy, l.updatedBy]).filter((x): x is string => !!x)));
      const people = ids.length ? await db.select({ id: users.id, name: users.name, companyName: users.companyName }).from(users).where(inArray(users.id, ids)) : [];
      const nameOf = (id: string | null) => {
        const p = people.find((x) => x.id === id);
        return p ? p.companyName || p.name : null;
      };
      res.json(list.map((l) => ({ ...l, ownerName: nameOf(l.ownerId), createdByName: nameOf(l.createdBy), updatedByName: nameOf(l.updatedBy) })));
    } catch (e: any) {
      if (e?.code === "42P01") return res.json([]);
      console.error("list imports:", e);
      res.status(500).json({ error: "Failed to load imports" });
    }
  });

  // Upload → new draft (or the existing draft for the same file)
  app.post("/api/admin/screen-imports", ...admin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Upload the filled .xlsx template" });
      const ownerId = String(req.body.ownerId || "");
      const host = String(req.body.host || "").trim().slice(0, 40) || null;
      const screenStatus = String(req.body.screenStatus || "pending");
      if (!(await ownerOk(ownerId))) return res.status(400).json({ error: "Pick the screen owner" });
      if (!SCREEN_STATUSES.includes(screenStatus as any)) return res.status(400).json({ error: "Pick a status" });

      const parsed = await parseUpload(req.file.buffer);
      if ("error" in parsed) return res.status(400).json({ error: parsed.error });

      const [same] = await db
        .select({ id: screenImports.id, state: screenImports.state, importedAt: screenImports.importedAt, createdBy: screenImports.createdBy })
        .from(screenImports)
        .where(and(eq(screenImports.fileHash, parsed.hash), inArray(screenImports.state, ["draft", "imported"])))
        .limit(1);
      if (same?.state === "imported") {
        const [who] = await db.select({ name: users.name }).from(users).where(eq(users.id, same.createdBy));
        return res.status(409).json({ error: `This exact file was already imported on ${same.importedAt?.toLocaleDateString("en-IN")}${who ? ` by ${who.name}` : ""}. It can't be imported again.` });
      }
      if (same?.state === "draft") return res.status(200).json({ id: same.id, existingDraft: true });

      const ctx = await buildContext(parsed.venueType, parsed.rows, null);
      const rows = normalizeRows(parsed.rows, ctx);
      const issues = validateRows(rows, await buildContext(parsed.venueType, rows, null));
      const sum = summarize(rows, issues);
      const [draft] = await db
        .insert(screenImports)
        .values({
          fileName: req.file.originalname.slice(0, 200),
          fileHash: parsed.hash,
          venueType: parsed.venueType,
          ownerId,
          host,
          screenStatus,
          rows,
          errorCount: sum.blocking,
          createdBy: req.user!.id,
          updatedBy: req.user!.id,
        })
        .returning({ id: screenImports.id });
      res.status(201).json({ id: draft.id, notices: parsed.notices });
    } catch (e: any) {
      if (e?.code === "42P01") return res.status(503).json({ error: "Run the venue metrics migration first" });
      console.error("upload import:", e);
      res.status(500).json({ error: "Failed to read the file" });
    }
  });

  app.get("/api/admin/screen-imports/:id", ...admin, async (req, res) => {
    try {
      const [draft] = await db.select().from(screenImports).where(eq(screenImports.id, req.params.id));
      if (!draft) return res.status(404).json({ error: "Import not found" });
      const { issues, summary } = await checkDraft(draft);
      res.json({ ...draft, issues, summary });
    } catch (e) {
      console.error("get import:", e);
      res.status(500).json({ error: "Failed to load the import" });
    }
  });

  // Save edits (rows and/or owner, host, status) → fresh issues
  app.put("/api/admin/screen-imports/:id", ...admin, async (req, res) => {
    try {
      const [draft] = await db.select().from(screenImports).where(eq(screenImports.id, req.params.id));
      if (!draft) return res.status(404).json({ error: "Import not found" });
      if (draft.state !== "draft") return res.status(409).json({ error: "This import is no longer a draft" });
      const set: Partial<typeof screenImports.$inferInsert> = { updatedAt: new Date(), updatedBy: req.user!.id };
      if (req.body.ownerId !== undefined) {
        if (!(await ownerOk(String(req.body.ownerId)))) return res.status(400).json({ error: "Pick the screen owner" });
        set.ownerId = String(req.body.ownerId);
      }
      if (req.body.host !== undefined) set.host = String(req.body.host || "").trim().slice(0, 40) || null;
      if (req.body.screenStatus !== undefined) {
        if (!SCREEN_STATUSES.includes(req.body.screenStatus)) return res.status(400).json({ error: "Pick a status" });
        set.screenStatus = req.body.screenStatus;
      }
      let rows = draft.rows as ImportRow[];
      if (Array.isArray(req.body.rows)) {
        if (req.body.rows.length > 1000) return res.status(400).json({ error: "Too many rows" });
        const incoming: ImportRow[] = req.body.rows.map((r: any) => ({
          row: Number(r.row),
          values: r.values && typeof r.values === "object" ? r.values : {},
          differentScreen: !!r.differentScreen,
          warningsOk: !!r.warningsOk,
        }));
        const ctx = await buildContext(draft.venueType, incoming, draft.id);
        rows = normalizeRows(incoming, ctx);
        set.rows = rows;
      }
      const { issues, summary } = await checkDraft({ id: draft.id, venueType: draft.venueType, rows });
      set.errorCount = summary.blocking;
      const [saved] = await db.update(screenImports).set(set).where(eq(screenImports.id, draft.id)).returning();
      res.json({ ...saved, issues, summary });
    } catch (e) {
      console.error("save import:", e);
      res.status(500).json({ error: "Failed to save" });
    }
  });

  // Replace the rows with a corrected file (same venue category); owner/host/status are kept
  app.post("/api/admin/screen-imports/:id/upload", ...admin, upload.single("file"), async (req, res) => {
    try {
      const [draft] = await db.select().from(screenImports).where(eq(screenImports.id, req.params.id));
      if (!draft) return res.status(404).json({ error: "Import not found" });
      if (draft.state !== "draft") return res.status(409).json({ error: "This import is no longer a draft" });
      if (!req.file) return res.status(400).json({ error: "Upload the corrected .xlsx file" });
      const parsed = await parseUpload(req.file.buffer);
      if ("error" in parsed) return res.status(400).json({ error: parsed.error });
      if (parsed.venueType !== draft.venueType) {
        return res.status(400).json({ error: `This file is a ${getVenueType(parsed.venueType)?.label} template; this draft is for ${getVenueType(draft.venueType)?.label}.` });
      }
      const [same] = await db.select({ id: screenImports.id }).from(screenImports).where(and(eq(screenImports.fileHash, parsed.hash), eq(screenImports.state, "imported"))).limit(1);
      if (same) return res.status(409).json({ error: "This exact file was already imported. It can't be imported again." });
      const ctx = await buildContext(draft.venueType, parsed.rows, draft.id);
      const rows = normalizeRows(parsed.rows, ctx);
      const { issues, summary } = await checkDraft({ id: draft.id, venueType: draft.venueType, rows });
      const [saved] = await db
        .update(screenImports)
        .set({ rows, fileName: req.file.originalname.slice(0, 200), fileHash: parsed.hash, errorCount: summary.blocking, updatedAt: new Date(), updatedBy: req.user!.id })
        .where(eq(screenImports.id, draft.id))
        .returning();
      res.json({ ...saved, issues, summary, notices: parsed.notices });
    } catch (e) {
      console.error("re-upload import:", e);
      res.status(500).json({ error: "Failed to read the file" });
    }
  });

  // The draft's rows as a filled template (for the admin's records / offline fixing)
  app.get("/api/admin/screen-imports/:id/download", ...admin, async (req, res) => {
    try {
      const [draft] = await db.select().from(screenImports).where(eq(screenImports.id, req.params.id));
      if (!draft) return res.status(404).json({ error: "Import not found" });
      const buf = await buildTemplate(draft.venueType, draft.rows as ImportRow[]);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${draft.fileName.replace(/\.xlsx$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_")}_corrected.xlsx"`);
      res.send(buf);
    } catch (e) {
      console.error("download import:", e);
      res.status(500).json({ error: "Failed to build the file" });
    }
  });

  app.post("/api/admin/screen-imports/:id/commit", ...admin, async (req, res) => {
    try {
      const out = await commitImport(req.params.id, req.user!.id);
      if ("error" in out) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("commit import:", e);
      res.status(500).json({ error: "Import failed — nothing was saved" });
    }
  });

  app.delete("/api/admin/screen-imports/:id", ...admin, async (req, res) => {
    try {
      const [draft] = await db.select({ state: screenImports.state }).from(screenImports).where(eq(screenImports.id, req.params.id));
      if (!draft) return res.status(404).json({ error: "Import not found" });
      if (draft.state !== "draft") return res.status(409).json({ error: "Only drafts can be discarded" });
      await db.update(screenImports).set({ state: "discarded", updatedAt: new Date(), updatedBy: req.user!.id }).where(eq(screenImports.id, req.params.id));
      res.json({ ok: true });
    } catch (e) {
      console.error("discard import:", e);
      res.status(500).json({ error: "Failed to discard" });
    }
  });
}
