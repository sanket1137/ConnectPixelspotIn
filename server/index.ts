// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";

if (process.env.NODE_ENV === "production") {
  const envPath = resolve(process.cwd(), ".env.production");
  config({ path: envPath });
  console.log("✅ Loaded environment from .env.production");
} else {
  config();
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { setupSecurity } from "./security";
import { db, storage } from "./storage";
import { setupWebSocket, broadcastCampaignUpdate } from "./websocket";

const app = express();

// Apply security measures FIRST (before any other middleware)
setupSecurity(app);

// Capture raw body before JSON parsing (needed for Razorpay webhook HMAC verification)
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Setup WebSocket server
  setupWebSocket(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Start campaign lifecycle automation
  startCampaignLifecycleScheduler();

  // Start payout expiry checker (every minute)
  startPayoutExpiryChecker();

  // Start payment deadline checker (every 5 minutes)
  startPaymentDeadlineChecker();
})();

// Campaign lifecycle automation - runs every hour
function startCampaignLifecycleScheduler() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  
  async function updateCampaignStatuses() {
    try {
      const now = new Date();
      const campaigns = await storage.getAllCampaigns();
      
      for (const campaign of campaigns) {
        const startDate = new Date(campaign.startDate);
        const endDate = new Date(campaign.endDate);
        
        // approved → live (on start date)
        if (campaign.status === "approved" && now >= startDate && now < endDate) {
          await storage.updateCampaignStatus(campaign.id, "live");
          console.log(`✅ Campaign ${campaign.id} updated to LIVE`);
          broadcastCampaignUpdate(campaign.id, "live");
        }
        
        // live → completed (on end date)
        if (campaign.status === "live" && now >= endDate) {
          await storage.updateCampaignStatus(campaign.id, "completed");
          console.log(`✅ Campaign ${campaign.id} updated to COMPLETED`);
          broadcastCampaignUpdate(campaign.id, "completed");
        }
      }

      // Also sync booking statuses with campaign lifecycle
      const bookings = await storage.getAllBookings();
      for (const booking of bookings) {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);

        // approved → active (on start date)
        if (booking.status === "approved" && now >= bookingStart && now < bookingEnd) {
          await storage.updateBookingStatus(booking.id, "active");
          console.log(`✅ Booking ${booking.id} updated to ACTIVE`);
        }

        // active → completed (on end date)
        if (booking.status === "active" && now >= bookingEnd) {
          await storage.updateBookingStatus(booking.id, "completed");
          console.log(`✅ Booking ${booking.id} updated to COMPLETED`);
        }
      }
    } catch (error) {
      console.error("❌ Campaign lifecycle update error:", error);
    }
  }
  
  // Run immediately on startup, then every hour
  updateCampaignStatuses();
  setInterval(updateCampaignStatuses, INTERVAL_MS);
  
  console.log("🔄 Campaign lifecycle scheduler started (runs every hour)");
}

// Payout expiry checker - runs every minute to expire pending payouts past 5-min window
function startPayoutExpiryChecker() {
  const INTERVAL_MS = 60 * 1000; // 1 minute
  
  async function checkExpiredPayouts() {
    try {
      const expired = await storage.getExpiredPendingPayouts();
      for (const payout of expired) {
        await storage.updateOwnerPayout(payout.id, { status: "expired" });
        console.log(`⏰ Payout ${payout.id} expired (owner did not accept in time)`);

        // Notify admin that payout expired
        const admins = await storage.getUsersByRole("admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "payout_expired",
            title: "Payout Expired",
            message: `Payout #${payout.payoutNumber} of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")} expired. Owner did not accept in time. You can regenerate.`,
            data: { payoutId: payout.id, ownerId: payout.ownerId },
            actionUrl: `/admin/payouts`,
          });
        }

        // Notify owner that their payout expired
        await storage.createNotification({
          userId: payout.ownerId,
          type: "payout_expired",
          title: "Payment Request Expired",
          message: `Your payout of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")} has expired because it was not accepted within 5 minutes. The admin may send a new request.`,
          data: { payoutId: payout.id },
          actionUrl: `/owner/payouts`,
        });
      }
    } catch (error) {
      console.error("❌ Payout expiry check error:", error);
    }
  }
  
  // Run every minute
  setInterval(checkExpiredPayouts, INTERVAL_MS);
  console.log("🔄 Payout expiry checker started (runs every minute)");
}

// Payment deadline checker - expires bookings where advertiser didn't pay in time
function startPaymentDeadlineChecker() {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  async function checkExpiredPaymentDeadlines() {
    try {
      const expiredBookings = await storage.getBookingsWithExpiredPaymentDeadline();
      for (const booking of expiredBookings) {
        // Expire the booking
        await storage.updateBookingStatus(booking.id, "expired");
        console.log(`⏰ Booking ${booking.id} expired (advertiser did not pay before deadline)`);

        // Notify advertiser
        const campaign = await storage.getCampaign(booking.campaignId);
        if (campaign) {
          await storage.createNotification({
            userId: campaign.advertiserId,
            type: "booking_expired",
            title: "Booking Expired — Payment Not Received",
            message: `Your booking for campaign "${campaign.name}" has expired because payment was not completed before the deadline.`,
            data: { bookingId: booking.id, campaignId: campaign.id },
            actionUrl: `/advertiser/campaigns/${campaign.id}`,
          });
        }

        // Notify owner
        const screen = await storage.getScreen(booking.screenId);
        if (screen && screen.ownerId) {
          await storage.createNotification({
            userId: screen.ownerId,
            type: "booking_expired",
            title: "Booking Expired — Advertiser Did Not Pay",
            message: `The booking for screen "${screen.name}" has expired. The advertiser did not complete payment in time. The slot is now available again.`,
            data: { bookingId: booking.id, screenId: screen.id },
            actionUrl: `/owner/requests`,
          });
        }

        // Notify admins
        const admins = await storage.getUsersByRole("admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "booking_expired",
            title: "Booking Expired — Payment Deadline Passed",
            message: `Booking ${booking.id} expired — advertiser did not pay before the deadline.`,
            data: { bookingId: booking.id },
            actionUrl: `/admin/bookings`,
          });
        }
      }
    } catch (error) {
      console.error("❌ Payment deadline check error:", error);
    }
  }

  // Run every 5 minutes
  setInterval(checkExpiredPaymentDeadlines, INTERVAL_MS);
  console.log("🔄 Payment deadline checker started (runs every 5 minutes)");
}
