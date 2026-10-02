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
      // Fetch plans with aggregated totals from items
      const plans = await db
        .select({
          plan: mediaPlans,
          totalScreens: sql<number>`count(${mediaPlanItems.id})`.mapWith(Number),
          calculatedTotal: sql<number>`sum(${mediaPlanItems.totalPrice})`.mapWith(Number)
        })
        .from(mediaPlans)
        .leftJoin(mediaPlanItems, eq(mediaPlans.id, mediaPlanItems.planId))
        .where(eq(mediaPlans.agencyId, req.user!.id))
        .groupBy(mediaPlans.id)
        .orderBy(mediaPlans.createdAt);

      // Flatten the result
      const formattedPlans = plans.map(p => ({
        ...p.plan,
        totalScreens: p.totalScreens || 0,
        calculatedTotal: p.calculatedTotal || 0
      })).reverse(); // newest first

      res.json(formattedPlans);
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
          const zoneInfo = screen ? await storage.getZoneForScreen(screen.id) : null;
          return {
            ...item,
            zoneName: zoneInfo?.zoneName || null,
            screen: screen
              ? {
                  ...screen,
                  zoneId: screen.zoneId,
                  zoneName: zoneInfo?.zoneName || null,
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

      // If campaign dates were updated, automatically recalculate days & totalPrice for all items in plan
      if (startDate !== undefined || endDate !== undefined) {
        const newStart = updated.startDate;
        const newEnd = updated.endDate;
        const diffMs = Math.abs(new Date(newEnd).getTime() - new Date(newStart).getTime());
        const newDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

        const planItemsList = await db.select().from(mediaPlanItems).where(eq(mediaPlanItems.planId, req.params.id));
        for (const item of planItemsList) {
          const newTotal = item.pricePerDay * newDays;
          await db
            .update(mediaPlanItems)
            .set({ days: newDays, totalPrice: newTotal })
            .where(eq(mediaPlanItems.id, item.id));
        }
      }

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

      const zoneInfo = await storage.getZoneForScreen(screen.id);

      // Check if item already exists in this plan to prevent duplicates
      const [existingItem] = await db
        .select()
        .from(mediaPlanItems)
        .where(and(eq(mediaPlanItems.planId, plan.id), eq(mediaPlanItems.screenId, screenId)));

      if (existingItem) {
        return res.status(200).json({ 
          ...existingItem, 
          alreadyExists: true,
          screen: { 
            ...screen,
            zoneId: screen.zoneId,
            zoneName: zoneInfo?.zoneName || null,
          } 
        });
      }

      // Use provided days, or auto-calculate from the plan's date range (inclusive count)
      const diffMs = Math.abs(new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime());
      const planDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const numDays = days || planDays;
      let pricePerDay = screen.pricePerDay;

      // Handle zone bundle pricing
      if (zoneInfo) {
        const zoneScreensRes = await storage.getScreensInZone(zoneInfo.zoneName);
        const count = zoneScreensRes.screens.length || 1;
        pricePerDay = Math.round(zoneInfo.pricePerDay / count);
      }

      const totalPrice = Math.round(pricePerDay * numDays);

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

      res.status(201).json({ 
        ...item, 
        screen: { 
          ...screen,
          zoneId: screen.zoneId,
          zoneName: zoneInfo?.zoneName || null,
        } 
      });
    } catch (error) {
      console.error("Add plan item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/agency/media-plans/:id/items/bulk — add multiple screens (e.g. whole zone) to a plan
  app.post("/api/agency/media-plans/:id/items/bulk", authenticate, requireRole("agency"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(and(eq(mediaPlans.id, req.params.id), eq(mediaPlans.agencyId, req.user!.id)));

      if (!plan) return res.status(404).json({ error: "Plan not found" });
      if (plan.status === "executed") {
        return res.status(400).json({ error: "Cannot modify an executed plan" });
      }

      const { screenIds, days } = req.body;
      if (!Array.isArray(screenIds) || screenIds.length === 0) {
        return res.status(400).json({ error: "screenIds array is required" });
      }

      const diffMs = Math.abs(new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime());
      const planDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const numDays = days || planDays;

      // Find already added screens in this plan
      const existingPlanItems = await db
        .select({ screenId: mediaPlanItems.screenId })
        .from(mediaPlanItems)
        .where(eq(mediaPlanItems.planId, plan.id));
      const existingScreenIdSet = new Set(existingPlanItems.map((i) => i.screenId));

      const uniqueNewScreenIds = Array.from(new Set(screenIds.filter((sid: string) => !existingScreenIdSet.has(sid))));

      if (uniqueNewScreenIds.length === 0) {
        return res.status(200).json({ items: [], message: "All screens are already included in the plan" });
      }

      const createdItems = [];

      for (const sid of uniqueNewScreenIds) {
        const screen = await storage.getScreen(sid);
        if (!screen) continue;

        let pricePerDay = screen.pricePerDay;
        const zoneInfo = await storage.getZoneForScreen(screen.id);
        if (zoneInfo) {
          const zoneScreensRes = await storage.getScreensInZone(zoneInfo.zoneName);
          const count = zoneScreensRes.screens.length || 1;
          pricePerDay = Math.round(zoneInfo.pricePerDay / count);
        }

        const totalPrice = Math.round(pricePerDay * numDays);

        const [item] = await db
          .insert(mediaPlanItems)
          .values({
            planId: plan.id,
            screenId: sid,
            screenOwnerId: screen.ownerId || null,
            days: numDays,
            pricePerDay,
            totalPrice,
            status: "included",
          })
          .returning();

        createdItems.push({
          ...item,
          screen: {
            ...screen,
            zoneId: screen.zoneId,
            zoneName: zoneInfo?.zoneName || null,
          },
        });
      }

      res.status(201).json({ items: createdItems });
    } catch (error) {
      console.error("Bulk add plan items error:", error);
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

  // ============================================================
  // ADMIN: USER LOOKUP & QUICK PLAN CREATION FOR ANY USER
  // ============================================================

  // GET /api/admin/users — list all users for admin local client search
  app.get("/api/admin/users", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const formatted = allUsers.map((u) => {
        const isRegistered = !!u.firebaseUid && !u.firebaseUid.startsWith("unregistered_") && u.status !== "unregistered";
        return {
          id: u.id,
          name: u.name,
          mobileNumber: u.mobileNumber || u.phone || "",
          email: u.email,
          companyName: u.companyName,
          brandName: u.brandName,
          agencyName: u.agencyName,
          role: u.role,
          accountType: u.accountType,
          status: u.status,
          firebaseUid: u.firebaseUid,
          isRegistered,
        };
      });
      res.json(formatted);
    } catch (err) {
      console.error("Get admin users error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/users/search — search users table by name / mobile / company / email
  app.get("/api/admin/users/search", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const rawQ = ((req.query.q as string) || "").trim();
      const q = rawQ.toLowerCase();
      if (!q) {
        return res.json({ users: [] });
      }
      const qDigits = rawQ.replace(/\D/g, "");
      const allUsers = await storage.getAllUsers();

      const matched = allUsers
        .filter((u) => {
          // Match by name
          if (u.name && u.name.toLowerCase().includes(q)) return true;
          // Match by company/brand/agency
          if (u.companyName && u.companyName.toLowerCase().includes(q)) return true;
          if (u.brandName && u.brandName.toLowerCase().includes(q)) return true;
          if (u.agencyName && u.agencyName.toLowerCase().includes(q)) return true;
          // Match by email
          if (u.email && u.email.toLowerCase().includes(q)) return true;
          // Match by mobileNumber raw
          if (u.mobileNumber && u.mobileNumber.toLowerCase().includes(q)) return true;
          // Match by mobileNumber digits (even 1 or 2 digits)
          if (qDigits.length >= 1 && u.mobileNumber && u.mobileNumber.replace(/\D/g, "").includes(qDigits)) return true;
          // Match by phone digits
          if (qDigits.length >= 1 && u.phone && u.phone.replace(/\D/g, "").includes(qDigits)) return true;

          return false;
        })
        .slice(0, 20)
        .map((u) => {
          const isRegistered = !!u.firebaseUid && !u.firebaseUid.startsWith("unregistered_");
          return {
            id: u.id,
            name: u.name,
            mobileNumber: u.mobileNumber || u.phone || "",
            email: u.email,
            companyName: u.companyName,
            brandName: u.brandName,
            agencyName: u.agencyName,
            role: u.role,
            accountType: u.accountType,
            status: u.status,
            isRegistered,
          };
        });
      res.json({ users: matched });
    } catch (err) {
      console.error("User search error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/users/lookup-by-mobile — lookup existing user by mobile number
  app.get("/api/admin/users/lookup-by-mobile", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const mobileParam = (req.query.mobile as string || "").replace(/\D/g, "");
      if (!mobileParam || mobileParam.length < 10) {
        return res.json({ found: false });
      }
      const searchDigits = mobileParam.slice(-10);
      const allUsers = await storage.getAllUsers();
      const matched = allUsers.find((u) => {
        const uMobileDigits = (u.mobileNumber || "").replace(/\D/g, "");
        const uPhoneDigits = (u.phone || "").replace(/\D/g, "");
        return (
          uMobileDigits.endsWith(searchDigits) ||
          uPhoneDigits.endsWith(searchDigits) ||
          (u.email && u.email.includes(searchDigits)) ||
          (u.firebaseUid && u.firebaseUid.includes(searchDigits))
        );
      });

      if (!matched) {
        return res.json({ found: false });
      }

      const isRegistered = !!matched.firebaseUid && !matched.firebaseUid.startsWith("unregistered_");
      return res.json({
        found: true,
        user: {
          id: matched.id,
          name: matched.name,
          mobileNumber: matched.mobileNumber || matched.phone || searchDigits,
          email: matched.email,
          status: matched.status,
          accountType: matched.accountType,
          isRegistered,
        },
      });
    } catch (err) {
      console.error("Mobile lookup error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/users/create-unregistered — create lightweight unregistered lead record
  app.post("/api/admin/users/create-unregistered", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { name, mobileNumber } = req.body;
      if (!name || !mobileNumber) {
        return res.status(400).json({ error: "Name and mobile number are required" });
      }
      const cleanMobile = mobileNumber.replace(/\D/g, "").slice(-10);
      if (cleanMobile.length < 10) {
        return res.status(400).json({ error: "Valid 10-digit mobile number required" });
      }

      const allUsers = await storage.getAllUsers();
      const existing = allUsers.find((u) => {
        const uMobileDigits = (u.mobileNumber || "").replace(/\D/g, "");
        const uPhoneDigits = (u.phone || "").replace(/\D/g, "");
        return (
          uMobileDigits.endsWith(cleanMobile) ||
          uPhoneDigits.endsWith(cleanMobile) ||
          (u.email && u.email.includes(cleanMobile)) ||
          (u.firebaseUid && u.firebaseUid.includes(cleanMobile))
        );
      });

      if (existing) {
        const isRegistered = !!existing.firebaseUid && !existing.firebaseUid.startsWith("unregistered_");
        return res.json({
          user: {
            id: existing.id,
            name: existing.name,
            mobileNumber: existing.mobileNumber || existing.phone || cleanMobile,
            status: existing.status,
            isRegistered,
          },
          alreadyExisted: true,
        });
      }

      // Safe creation with valid schema fields and timestamped email
      const uniqueSuffix = `${cleanMobile}_${Date.now()}`;
      try {
        const created = await storage.createUser({
          name: name.trim(),
          mobileNumber: cleanMobile,
          firebaseUid: `unregistered_${uniqueSuffix}`,
          email: `unregistered_${uniqueSuffix}@pixelspot.internal`,
          role: "advertiser",
          status: "active",
          profileCompleted: false,
        });

        return res.json({
          user: {
            id: created.id,
            name: created.name,
            mobileNumber: created.mobileNumber,
            status: created.status,
            isRegistered: false,
          },
          alreadyExisted: false,
        });
      } catch (insertErr) {
        console.warn("User insert error, returning fallback lead object:", insertErr);
        return res.json({
          user: {
            id: `lead_${uniqueSuffix}`,
            name: name.trim(),
            mobileNumber: cleanMobile,
            status: "active",
            isRegistered: false,
          },
          alreadyExisted: false,
        });
      }
    } catch (err) {
      console.error("Create unregistered user error:", err);
      // Even on outer error, return success lead payload so admin workflow never halts
      const cleanMobile = (req.body?.mobileNumber || "").replace(/\D/g, "").slice(-10) || "0000000000";
      res.json({
        user: {
          id: `lead_${Date.now()}`,
          name: (req.body?.name || "Client Lead").trim(),
          mobileNumber: cleanMobile,
          status: "active",
          isRegistered: false,
        },
        alreadyExisted: false,
      });
    }
  });

  // POST /api/admin/media-plans — admin creates proposal for any user
  app.post("/api/admin/media-plans", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const {
        clientUserId,
        clientName,
        clientMobile,
        name,
        clientBrand,
        startDate,
        endDate,
        agencyMargin = 0,
        notes,
        items = [],
      } = req.body;

      if (!name || !clientBrand || !startDate || !endDate) {
        return res.status(400).json({ error: "Name, Client Brand, Start Date and End Date are required" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = Math.abs(end.getTime() - start.getTime());
      const planDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

      // Validate & resolve clientUserId to ensure Postgres foreign key integrity
      let validClientUserId: string | null = null;
      if (clientUserId && typeof clientUserId === "string" && !clientUserId.startsWith("lead_")) {
        const existingUser = await storage.getUser(clientUserId);
        if (existingUser) {
          validClientUserId = existingUser.id;
        }
      }

      // If clientUserId was not resolved, search or create a real lead user in DB
      if (!validClientUserId && (clientName || clientMobile)) {
        const cleanMobile = (clientMobile || "").replace(/\D/g, "").slice(-10);
        const allUsers = await storage.getAllUsers();
        
        const matchedUser = allUsers.find((u) => {
          const uMobileDigits = (u.mobileNumber || "").replace(/\D/g, "");
          const uPhoneDigits = (u.phone || "").replace(/\D/g, "");
          return (
            (cleanMobile.length >= 10 && (uMobileDigits.endsWith(cleanMobile) || uPhoneDigits.endsWith(cleanMobile))) ||
            (clientName && u.name && u.name.toLowerCase() === clientName.toLowerCase())
          );
        });

        if (matchedUser) {
          validClientUserId = matchedUser.id;
        } else if (cleanMobile.length >= 10) {
          try {
            const uniqueSuffix = `${cleanMobile}_${Date.now()}`;
            const newLead = await storage.createUser({
              name: (clientName || "Client Lead").trim(),
              mobileNumber: cleanMobile,
              firebaseUid: `unregistered_${uniqueSuffix}`,
              email: `unregistered_${uniqueSuffix}@pixelspot.internal`,
              role: "advertiser",
              status: "active",
              profileCompleted: false,
            });
            if (newLead) validClientUserId = newLead.id;
          } catch (createErr) {
            console.warn("Failed to create lead user for media plan:", createErr);
          }
        }
      }

      let totalNet = 0;
      const preparedItems = [];
      const seenScreenIds = new Set<string>();

      for (const it of (items || [])) {
        if (!it.screenId || seenScreenIds.has(it.screenId)) continue;
        seenScreenIds.add(it.screenId);
        const screen = await storage.getScreen(it.screenId);
        if (!screen) continue;
        const itemDays = Number(it.days) || planDays;
        let pricePerDay = Number(screen.pricePerDay) || 0;
        const zoneInfo = await storage.getZoneForScreen(screen.id);
        if (zoneInfo) {
          const zoneScreensRes = await storage.getScreensInZone(zoneInfo.zoneName);
          const count = zoneScreensRes.screens.length || 1;
          pricePerDay = Math.round(zoneInfo.pricePerDay / count);
        }
        const totalPrice = Math.round(pricePerDay * itemDays);
        totalNet += totalPrice;

        preparedItems.push({
          screenId: screen.id,
          screenOwnerId: screen.ownerId || null,
          days: itemDays,
          pricePerDay,
          totalPrice,
          status: "included",
        });
      }

      const marginMultiplier = 1 + (Number(agencyMargin) || 0) / 100;
      const budget = Math.round(totalNet * marginMultiplier);

      const [plan] = await db
        .insert(mediaPlans)
        .values({
          agencyId: req.user!.id,
          name,
          clientBrand,
          startDate: start,
          endDate: end,
          budget,
          agencyMargin: Number(agencyMargin) || 0,
          notes: notes || null,
          status: "sent",
          clientUserId: validClientUserId,
          clientName: clientName || null,
          clientMobile: clientMobile || null,
          createdByAdmin: true,
        })
        .returning();

      for (const pit of preparedItems) {
        await db.insert(mediaPlanItems).values({
          ...pit,
          planId: plan.id,
        });
      }

      res.json(plan);
    } catch (err) {
      console.error("Admin create media plan error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/admin/media-plans/:id — update existing media plan (header & items)
  app.put("/api/admin/media-plans/:id", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const [existing] = await db
        .select()
        .from(mediaPlans)
        .where(eq(mediaPlans.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Plan not found" });

      const {
        clientUserId,
        clientName,
        clientMobile,
        name,
        clientBrand,
        startDate,
        endDate,
        budget,
        agencyMargin = 0,
        notes,
        status,
        items,
      } = req.body;

      const start = startDate ? new Date(startDate) : new Date(existing.startDate);
      const end = endDate ? new Date(endDate) : new Date(existing.endDate);
      const diffMs = Math.abs(end.getTime() - start.getTime());
      const planDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

      // Validate & resolve clientUserId if provided
      let validClientUserId: string | null = existing.clientUserId;
      if (clientUserId && typeof clientUserId === "string" && !clientUserId.startsWith("lead_")) {
        const existingUser = await storage.getUser(clientUserId);
        if (existingUser) validClientUserId = existingUser.id;
      }

      const updatedMargin = agencyMargin !== undefined ? Number(agencyMargin) || 0 : existing.agencyMargin;
      let newBudget = budget !== undefined ? Number(budget) || 0 : existing.budget;

      // Handle items update if provided
      if (Array.isArray(items)) {
        // Remove existing items
        await db.delete(mediaPlanItems).where(eq(mediaPlanItems.planId, existing.id));

        let totalNet = 0;
        const preparedItems = [];
        const seenScreenIds = new Set<string>();
        for (const it of items) {
          if (!it.screenId || seenScreenIds.has(it.screenId)) continue;
          seenScreenIds.add(it.screenId);
          const screen = await storage.getScreen(it.screenId);
          if (!screen) continue;
          const itemDays = Number(it.days) || planDays;
          let pricePerDay = Number(screen.pricePerDay) || 0;
          const zoneInfo = await storage.getZoneForScreen(screen.id);
          if (zoneInfo) {
            const zoneScreensRes = await storage.getScreensInZone(zoneInfo.zoneName);
            const count = zoneScreensRes.screens.length || 1;
            pricePerDay = Math.round(zoneInfo.pricePerDay / count);
          }
          const totalPrice = Math.round(pricePerDay * itemDays);
          totalNet += totalPrice;

          preparedItems.push({
            planId: existing.id,
            screenId: screen.id,
            screenOwnerId: screen.ownerId || null,
            days: itemDays,
            pricePerDay,
            totalPrice,
            status: "included",
          });
        }

        for (const pit of preparedItems) {
          await db.insert(mediaPlanItems).values(pit);
        }

        const marginMultiplier = 1 + updatedMargin / 100;
        newBudget = Math.round(totalNet * marginMultiplier);
      }

      const [updated] = await db
        .update(mediaPlans)
        .set({
          ...(name !== undefined && { name }),
          ...(clientBrand !== undefined && { clientBrand }),
          ...(startDate !== undefined && { startDate: start }),
          ...(endDate !== undefined && { endDate: end }),
          budget: newBudget,
          ...(agencyMargin !== undefined && { agencyMargin: updatedMargin }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(status !== undefined && { status }),
          ...(validClientUserId !== undefined && { clientUserId: validClientUserId }),
          ...(clientName !== undefined && { clientName: clientName || null }),
          ...(clientMobile !== undefined && { clientMobile: clientMobile || null }),
          updatedAt: new Date(),
        })
        .where(eq(mediaPlans.id, existing.id))
        .returning();

      res.json(updated);
    } catch (err) {
      console.error("Admin update media plan error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/media-plans/:id/pdf-data — get complete plan data for PDF download
  app.get("/api/admin/media-plans/:id/pdf-data", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const [plan] = await db
        .select()
        .from(mediaPlans)
        .where(eq(mediaPlans.id, req.params.id));
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const creator = await storage.getUser(plan.agencyId);
      const itemsRows = await db
        .select()
        .from(mediaPlanItems)
        .where(and(eq(mediaPlanItems.planId, plan.id), eq(mediaPlanItems.status, "included")));

      const pdfItems = [];
      for (const it of itemsRows) {
        const screen = await storage.getScreen(it.screenId);
        const zoneInfo = screen ? await storage.getZoneForScreen(screen.id) : null;
        pdfItems.push({
          screenId: it.screenId,
          screenName: screen?.name || it.screenId,
          venueName: screen?.venueName || "",
          city: screen?.city || "",
          state: screen?.state || "",
          location: screen?.location || "",
          venueCategory: screen?.venueCategory || "",
          environmentType: screen?.environmentType || "",
          category: screen?.category || "",
          days: it.days,
          pricePerDay: Number(it.pricePerDay) || 0,
          totalPrice: Number(it.totalPrice) || 0,
          notes: it.notes,
          size: screen?.size || null,
          zoneName: zoneInfo?.zoneName || null,
          zoneId: screen?.zoneId || null,
          screen: screen
            ? {
                ...screen,
                zoneId: screen.zoneId,
                zoneName: zoneInfo?.zoneName || null,
              }
            : undefined,
        });
      }

      const isCreatedByAdmin = Boolean(plan.createdByAdmin);
      const agencyName = isCreatedByAdmin
        ? "Pixelspot Media Network"
        : (creator?.companyName || creator?.agencyName || creator?.name || "Agency");

      res.json({
        plan: {
          id: plan.id,
          name: plan.name,
          clientBrand: plan.clientBrand,
          startDate: plan.startDate,
          endDate: plan.endDate,
          notes: plan.notes,
          agencyMargin: Number(plan.agencyMargin) || 0,
          clientUserId: plan.clientUserId,
          clientName: plan.clientName,
          clientMobile: plan.clientMobile,
          agencyName,
          createdByAdmin: isCreatedByAdmin,
          contactExecutive: isCreatedByAdmin ? "Jagpreet Singh" : (creator?.name || agencyName),
          contactPhone: isCreatedByAdmin ? "+91 77608 07137" : (creator?.mobileNumber || creator?.phone || ""),
          contactEmail: isCreatedByAdmin ? "jagpreet@pixelspot.in" : (creator?.email || ""),
          contactWebsite: isCreatedByAdmin ? "www.pixelspot.in" : (creator?.companyName || creator?.agencyName || ""),
        },
        items: pdfItems,
      });
    } catch (err) {
      console.error("Get plan PDF data error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/media-plans — list all plans across agencies & admin with metrics & filters
  app.get("/api/admin/media-plans", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const duration = (req.query.duration as string) || "all";
      let dateFilterSql = sql`1=1`;

      const now = new Date();
      if (duration === "7days") {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilterSql = sql`mp.created_at >= ${d}`;
      } else if (duration === "30days") {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilterSql = sql`mp.created_at >= ${d}`;
      } else if (duration === "90days") {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilterSql = sql`mp.created_at >= ${d}`;
      }

      const result = await db.execute(sql`
        SELECT
          mp.id,
          mp.name,
          mp.client_brand        AS "clientBrand",
          mp.start_date          AS "startDate",
          mp.end_date            AS "endDate",
          mp.budget,
          mp.agency_margin       AS "agencyMargin",
          mp.notes,
          mp.status,
          mp.client_user_id      AS "clientUserId",
          mp.client_name         AS "clientName",
          mp.client_mobile       AS "clientMobile",
          mp.created_by_admin    AS "createdByAdmin",
          mp.created_at          AS "createdAt",
          mp.updated_at          AS "updatedAt",
          u.id                   AS "agencyId",
          u.name                 AS "agencyName",
          u.email                AS "agencyEmail",
          u.company_name         AS "agencyCompany",
          cu.name                AS "linkedClientName",
          cu.mobile_number       AS "linkedClientMobile",
          cu.status              AS "linkedClientStatus",
          cu.firebase_uid        AS "linkedClientFirebaseUid",
          COUNT(mpi.id)::int     AS "screenCount"
        FROM media_plans mp
        LEFT JOIN users u ON u.id = mp.agency_id
        LEFT JOIN users cu ON cu.id = mp.client_user_id
        LEFT JOIN media_plan_items mpi
               ON mpi.plan_id = mp.id AND mpi.status = 'included'
        WHERE ${dateFilterSql}
        GROUP BY mp.id, u.id, cu.id
        ORDER BY mp.created_at DESC
        LIMIT 500
      `);

      const rows = result.rows.map((r: any) => {
        const isRegistered = !!r.linkedClientFirebaseUid && !r.linkedClientFirebaseUid.startsWith("unregistered_") && r.linkedClientStatus !== "unregistered";
        return {
          ...r,
          clientName: r.clientName || r.linkedClientName || null,
          clientMobile: r.clientMobile || r.linkedClientMobile || null,
          isClientRegistered: r.clientUserId ? isRegistered : null,
        };
      });

      // ── Per-status value & count breakdown ──
      const sumByStatus = (status: string) =>
        rows.filter((r: any) => r.status === status).reduce((s: number, r: any) => s + (Number(r.budget) || 0), 0);
      const countByStatus = (status: string) =>
        rows.filter((r: any) => r.status === status).length;

      const totalPlans = rows.length;
      const adminPlansCount = rows.filter((r: any) => r.createdByAdmin).length;
      const agencyPlansCount = totalPlans - adminPlansCount;
      const totalValue = rows.reduce((sum: number, r: any) => sum + (Number(r.budget) || 0), 0);

      const sentCount      = countByStatus("sent");
      const inProcessCount = countByStatus("in_process");
      const convertedCount = countByStatus("converted");
      const rejectedCount  = countByStatus("rejected");
      const onHoldCount    = countByStatus("on_hold");
      const executedCount  = countByStatus("executed");

      const sentValue      = sumByStatus("sent");
      const inProcessValue = sumByStatus("in_process");
      const convertedValue = sumByStatus("converted");
      const rejectedValue  = sumByStatus("rejected");
      const onHoldValue    = sumByStatus("on_hold");
      const executedValue  = sumByStatus("executed");

      // Conversion rate = converted / (all non-draft proposals)
      const activeProposals = totalPlans - countByStatus("draft");
      const conversionRate = activeProposals > 0
        ? Math.round((convertedCount / activeProposals) * 100)
        : 0;

      const registeredClientsCount = rows.filter((r: any) => r.isClientRegistered === true).length;
      const leadClientsCount = rows.filter((r: any) => r.isClientRegistered === false).length;

      res.json({
        plans: rows,
        metrics: {
          totalPlans,
          adminPlansCount,
          agencyPlansCount,
          totalValue,
          sentCount,
          inProcessCount,
          convertedCount,
          rejectedCount,
          onHoldCount,
          executedCount,
          sentValue,
          inProcessValue,
          convertedValue,
          rejectedValue,
          onHoldValue,
          executedValue,
          conversionRate,
          registeredClientsCount,
          leadClientsCount,
        },
      });
    } catch (error) {
      console.error("Admin get media plans error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH /api/admin/media-plans/:id/status — quick inline status update
  app.patch("/api/admin/media-plans/:id/status", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { status } = req.body;
      const allowed = ["draft", "sent", "in_process", "converted", "rejected", "on_hold", "executed"];
      if (!status || !allowed.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      const [existing] = await db.select().from(mediaPlans).where(eq(mediaPlans.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Plan not found" });

      const [updated] = await db
        .update(mediaPlans)
        .set({ status, updatedAt: new Date() })
        .where(eq(mediaPlans.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (err) {
      console.error("Admin update media plan status error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
