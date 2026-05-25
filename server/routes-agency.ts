// ============================================================
// Agency Routes — Media Planning & Campaign Execution
// Follows the same pattern as routes-flow.ts
// Registered in routes.ts via registerAgencyRoutes()
// ============================================================
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { mediaPlans, mediaPlanItems, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export function registerAgencyRoutes(
  app: Express,
  authenticate: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void
) {

  // ========== MEDIA PLANS ==========

  // GET /api/agency/media-plans — list all plans for the logged-in agency
  app.get("/api/agency/media-plans", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const plans = await db
        .select()
        .from(mediaPlans)
        .where(eq(mediaPlans.agencyId, req.user!.id))
        .orderBy(mediaPlans.createdAt);

      res.json(plans.reverse()); // newest first
    } catch (error) {
      console.error("Get media plans error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/agency/media-plans — create a new plan
  app.post("/api/agency/media-plans", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const { name, clientBrand, startDate, endDate, budget, agencyMargin, notes } = req.body;

      if (!name || !clientBrand || !startDate || !endDate) {
        return res.status(400).json({ error: "name, clientBrand, startDate and endDate are required" });
      }

      const [plan] = await db
        .insert(mediaPlans)
        .values({
          agencyId: req.user!.id,
          name,
          clientBrand,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          budget: budget || 0,
          agencyMargin: agencyMargin || 0,
          notes: notes || null,
          status: "draft",
        })
        .returning();

      res.status(201).json(plan);
    } catch (error) {
      console.error("Create media plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/agency/media-plans/:id — get plan + items (with screen details)
  app.get("/api/agency/media-plans/:id", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });

      // Fetch items and join screen data
      const items = await db
        .select()
        .from(mediaPlanItems)
        .where(eq(mediaPlanItems.planId, plan.id));

      // Enrich each item with screen details (name, city, venueName, tags, owner info)
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const screen = await storage.getScreen(item.screenId);
          return {
            ...item,
            screen: screen
              ? {
                  id: screen.id,
                  name: screen.name,
                  city: screen.city,
                  state: screen.state,
                  venueName: screen.venueName,
                  venueCategory: screen.venueCategory,
                  location: screen.location,
                  environmentType: screen.environmentType,
                  lifestyleTags: screen.lifestyleTags,
                  ownerId: screen.ownerId,
                  pricePerDay: screen.pricePerDay,
                  // Owner tags visible in plan
                  category: screen.category,
                  trafficType: screen.trafficType,
                  incomeLevel: screen.incomeLevel,
                  avgDailyFootfall: screen.avgDailyFootfall,
                }
              : null,
          };
        })
      );

      res.json({ ...plan, items: enrichedItems });
    } catch (error) {
      console.error("Get media plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/agency/media-plans/:id — update plan metadata
  app.put("/api/agency/media-plans/:id", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [existing] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!existing) return res.status(404).json({ error: "Plan not found" });
      if (existing.status === "executed") {
        return res.status(400).json({ error: "Cannot edit an executed plan" });
      }

      const { name, clientBrand, startDate, endDate, budget, agencyMargin, notes, status } = req.body;

      const [updated] = await db
        .update(mediaPlans)
        .set({
          ...(name !== undefined && { name }),
          ...(clientBrand !== undefined && { clientBrand }),
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: new Date(endDate) }),
          ...(budget !== undefined && { budget }),
          ...(agencyMargin !== undefined && { agencyMargin }),
          ...(notes !== undefined && { notes }),
          ...(status !== undefined && { status }),
          updatedAt: new Date(),
        })
        .where(eq(mediaPlans.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Update media plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/agency/media-plans/:id — delete a draft plan
  app.delete("/api/agency/media-plans/:id", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [existing] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!existing) return res.status(404).json({ error: "Plan not found" });
      if (existing.status === "executed") {
        return res.status(400).json({ error: "Cannot delete an executed plan" });
      }

      // Delete items first
      await db.delete(mediaPlanItems).where(eq(mediaPlanItems.planId, req.params.id));
      await db.delete(mediaPlans).where(eq(mediaPlans.id, req.params.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete media plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== MEDIA PLAN ITEMS ==========

  // POST /api/agency/media-plans/:id/items — add a screen to a plan
  app.post("/api/agency/media-plans/:id/items", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });
      if (plan.status === "executed") {
        return res.status(400).json({ error: "Cannot modify an executed plan" });
      }

      const { screenId, days, notes } = req.body;
      if (!screenId) return res.status(400).json({ error: "screenId is required" });

      const screen = await storage.getScreen(screenId);
      if (!screen) return res.status(404).json({ error: "Screen not found" });

      // Use provided days, or auto-calculate from the plan's date range
      const planDays = Math.max(1, Math.round(
        (new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ));
      const numDays = days || planDays;
      const pricePerDay = screen.pricePerDay;
      const totalPrice = pricePerDay * numDays;

      const [item] = await db
        .insert(mediaPlanItems)
        .values({
          planId: plan.id,
          screenId,
          screenOwnerId: screen.ownerId || null,
          days: numDays,
          pricePerDay,
          totalPrice,
          notes: notes || null,
          status: "included",
        })
        .returning();

      res.status(201).json({ ...item, screen: { name: screen.name, city: screen.city, venueName: screen.venueName } });
    } catch (error) {
      console.error("Add plan item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/agency/media-plans/:id/items/:itemId — update item (days / notes / status)
  app.put("/api/agency/media-plans/:id/items/:itemId", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const { days, notes, status } = req.body;

      // Recalculate totalPrice if days changes
      let updateData: any = {
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      };

      if (days !== undefined) {
        const [existingItem] = await db
          .select()
          .from(mediaPlanItems)
          .where(eq(mediaPlanItems.id, req.params.itemId));

        if (existingItem) {
          updateData.days = days;
          updateData.totalPrice = existingItem.pricePerDay * days;
        }
      }

      const [updated] = await db
        .update(mediaPlanItems)
        .set(updateData)
        .where(and(eq(mediaPlanItems.id, req.params.itemId), eq(mediaPlanItems.planId, req.params.id)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Item not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update plan item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/agency/media-plans/:id/items/:itemId — remove a screen from a plan
  app.delete("/api/agency/media-plans/:id/items/:itemId", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });
      if (plan.status === "executed") {
        return res.status(400).json({ error: "Cannot modify an executed plan" });
      }

      await db
        .delete(mediaPlanItems)
        .where(and(eq(mediaPlanItems.id, req.params.itemId), eq(mediaPlanItems.planId, req.params.id)));

      res.json({ success: true });
    } catch (error) {
      console.error("Remove plan item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== PLAN ACTIONS ==========

  // POST /api/agency/media-plans/:id/send — mark plan as sent to client
  app.post("/api/agency/media-plans/:id/send", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const [updated] = await db
        .update(mediaPlans)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(mediaPlans.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Send plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/agency/media-plans/:id/execute — execute plan: create campaign + bookings
  app.post("/api/agency/media-plans/:id/execute", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });
      if (plan.status === "executed") {
        return res.status(400).json({ error: "Plan already executed" });
      }

      // Get included items only
      const items = await db
        .select()
        .from(mediaPlanItems)
        .where(and(eq(mediaPlanItems.planId, plan.id), eq(mediaPlanItems.status, "included")));

      if (items.length === 0) {
        return res.status(400).json({ error: "Plan has no screens to book" });
      }

      // Calculate margin-adjusted total budget
      const marginMultiplier = 1 + (plan.agencyMargin / 100);
      const netBudget = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const clientBudget = Math.round(netBudget * marginMultiplier);

      // Create a single campaign for this plan
      const campaign = await storage.createCampaign({
        advertiserId: req.user!.id,
        name: `${plan.name} — ${plan.clientBrand}`,
        objective: "brand_awareness",
        startDate: plan.startDate,
        endDate: plan.endDate,
        budget: clientBudget,
        summary: `Media plan executed by agency. Client: ${plan.clientBrand}. Margin: ${plan.agencyMargin}%.`,
        status: "pending",
      } as any);

      // Create bookings for each screen
      const bookingResults = [];
      for (const item of items) {
        const booking = await storage.createBooking({
          campaignId: campaign.id,
          screenId: item.screenId,
          price: Math.round(item.totalPrice * marginMultiplier),
          startDate: plan.startDate,
          endDate: plan.endDate,
          status: "pending_owner",
        } as any);
        bookingResults.push(booking);
      }

      // Mark plan as executed
      await db
        .update(mediaPlans)
        .set({ status: "executed", updatedAt: new Date() })
        .where(eq(mediaPlans.id, plan.id));

      res.json({
        success: true,
        campaignId: campaign.id,
        bookingsCreated: bookingResults.length,
        message: `Campaign created with ${bookingResults.length} screen booking(s)`,
      });
    } catch (error) {
      console.error("Execute media plan error:", error);
      res.status(500).json({ error: "Failed to execute plan" });
    }
  });

  // ========== AGENCY CAMPAIGNS (same as advertiser, scoped to agency) ==========

  app.get("/api/agency/campaigns", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaignsByAdvertiser(req.user!.id);
      res.json(campaigns);
    } catch (error) {
      console.error("Get agency campaigns error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/agency/campaigns/:id", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const bookings = await storage.getBookingsByCampaign(campaign.id);
      res.json({ ...campaign, bookings });
    } catch (error) {
      console.error("Get agency campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== AGENCY SCREENS DISCOVERY ==========
  // Agency can browse approved screens (same as advertisers)
  app.get("/api/agency/screens", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const screens = await storage.getPublicScreens();
      res.json(screens);
    } catch (error) {
      console.error("Get agency screens error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Agency: get a single screen detail
  app.get("/api/agency/screens/:id", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const screen = await storage.getScreen(req.params.id);
      if (!screen || screen.status !== "active") {
        return res.status(404).json({ error: "Screen not found" });
      }
      res.json(screen);
    } catch (error) {
      console.error("Get agency screen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Agency payments (same as advertiser)
  app.get("/api/agency/payments", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const payments = await storage.getPaymentsByAdvertiser(req.user!.id);
      res.json(payments);
    } catch (error) {
      console.error("Get agency payments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== ADMIN: VIEW ALL AGENCY MEDIA PLANS ==========

  // GET /api/admin/media-plans — list all plans across all agencies (admin only)
  app.get("/api/admin/media-plans", authenticate, requireRole("admin"), async (req, res) => {
    try {
      // Fetch all plans + item count + agency user details in one query
      const result = await db.execute(sql`
        SELECT
          mp.id,
          mp.name,
          mp.client_brand    AS "clientBrand",
          mp.start_date      AS "startDate",
          mp.end_date        AS "endDate",
          mp.budget,
          mp.agency_margin   AS "agencyMargin",
          mp.notes,
          mp.status,
          mp.created_at      AS "createdAt",
          mp.updated_at      AS "updatedAt",
          u.id               AS "agencyId",
          u.name             AS "agencyName",
          u.email            AS "agencyEmail",
          u.company_name     AS "agencyCompany",
          COUNT(mpi.id)::int AS "screenCount"
        FROM media_plans mp
        INNER JOIN users u ON u.id = mp.agency_id
        LEFT JOIN media_plan_items mpi
               ON mpi.plan_id = mp.id AND mpi.status = 'included'
        GROUP BY mp.id, u.id
        ORDER BY mp.created_at DESC
        LIMIT 500
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Admin get media plans error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
