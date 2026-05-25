// Payment, Payout, Creative, and Notification routes
// These routes extend the main routes.ts with the DOOH flow completion features
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { razorpayService } from "./services/razorpay";
import { notificationService } from "./notifications";
import { emailService } from "./email";
import { broadcastBookingUpdate, broadcastCampaignUpdate } from "./websocket";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import multer from "multer";
import crypto from "crypto";
import type { User } from "@shared/schema";

// Re-use the multer config for creative uploads
const creativeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video/image creatives
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/quicktime",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV"));
    }
  },
});

export function registerFlowRoutes(
  app: Express,
  authenticate: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void,
  requireVerified: (req: Request, res: Response, next: NextFunction) => void
) {

  // ========== RAZORPAY CONFIG (public key for client) ==========

  app.get("/api/payments/config", authenticate, requireVerified, (req, res) => {
    res.json({
      keyId: razorpayService.getPublicKey(),
      configured: razorpayService.isConfigured(),
    });
  });

  // ========== PAYMENT ROUTES (Advertiser) ==========

  // Create Razorpay order for a campaign payment
  app.post("/api/payments/create-order", authenticate, requireRole("advertiser", "agency"), async (req, res) => {
    try {
      const { campaignId, bookingId } = req.body;
      if (!campaignId || !bookingId) {
        return res.status(400).json({ error: "campaignId and bookingId are required" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      if (campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Not your campaign" });
      }

      // Get the specific booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (booking.campaignId !== campaignId) {
        return res.status(400).json({ error: "Booking does not belong to this campaign" });
      }
      if (!(booking.ownerApproved === true || booking.status === "approved")) {
        return res.status(400).json({ error: "Booking is not approved yet" });
      }

      // Check if this booking already has a completed payment
      const existingPayment = await storage.getPaymentByBooking(bookingId);
      if (existingPayment && existingPayment.status === "completed") {
        return res.status(400).json({ error: "Payment already completed for this booking" });
      }

      const bookingPrice = booking.price || 0;
      const basePaise = Math.round(bookingPrice * 100);

      const GST_PERCENT = 18;
      const gstPaise = Math.round(basePaise * GST_PERCENT / 100);
      const totalPaise = basePaise + gstPaise;

      // Create Razorpay order with GST-inclusive amount
      const order = await razorpayService.createOrder({
        amount: totalPaise,
        receipt: `bkg_${bookingId.replace(/-/g, "").slice(0, 30)}`,
        notes: {
          campaignId,
          bookingId,
          advertiserId: req.user!.id,
          campaignName: campaign.name || "",
        },
      });

      // Create or update payment record (store GST-inclusive total)
      if (existingPayment) {
        await storage.updatePayment(existingPayment.id, {
          gatewayOrderId: order.id,
          amount: totalPaise,
          status: "pending",
        });
      } else {
        await storage.createPayment({
          campaignId,
          bookingId,
          advertiserId: req.user!.id,
          amount: totalPaise,
          status: "pending",
          method: "razorpay",
          gatewayOrderId: order.id,
        });
      }

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayService.getPublicKey(),
      });
    } catch (error) {
      console.error("Create payment order error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // Verify Razorpay payment after client-side checkout
  app.post("/api/payments/verify", authenticate, requireRole("advertiser", "agency"), async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignId, bookingId } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment verification parameters" });
      }

      // Verify signature
      const isValid = razorpayService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isValid) {
        return res.status(400).json({ error: "Payment verification failed — invalid signature" });
      }

      // Update payment record
      const payment = await storage.getPaymentByGatewayOrder(razorpay_order_id);
      if (!payment) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      await storage.updatePayment(payment.id, {
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        status: "completed",
      });

      // Mark this specific booking as paid
      const paidBookingId = bookingId || payment.bookingId;
      if (paidBookingId) {
        await storage.updateBooking(paidBookingId, {
          bookingPaymentStatus: "paid",
        } as any);
      }

      // Check if ALL approved bookings for the campaign are now paid → update campaign paymentStatus
      if (payment.campaignId) {
        const campaignBookings = await storage.getBookingsByCampaign(payment.campaignId);
        const approvedBookings = campaignBookings.filter(b => b.ownerApproved === true || b.status === "approved");
        const allPaid = approvedBookings.length > 0 && approvedBookings.every(b => (b as any).bookingPaymentStatus === "paid" || b.id === paidBookingId);
        if (allPaid) {
          await storage.updateCampaign(payment.campaignId, {
            paymentStatus: "advertiser_paid",
          } as any);
        }
      }

      // Generate invoice for the advertiser
      // payment.amount is GST-inclusive total in paise
      const advertiser = req.user!;
      const campaign = payment.campaignId ? await storage.getCampaign(payment.campaignId) : null;
      const invoiceNumber = await storage.getNextInvoiceNumber();
      const gstPercent = 18;
      const totalAmount = payment.amount; // GST-inclusive amount that was actually charged
      const subtotal = Math.round(totalAmount * 100 / (100 + gstPercent)); // reverse-calculate base
      const gstAmount = totalAmount - subtotal;

      const invoice = await storage.createInvoice({
        invoiceNumber,
        type: "advertiser",
        advertiserId: advertiser.id,
        campaignId: payment.campaignId,
        subtotal,
        gstPercent,
        gstAmount,
        totalAmount,
        advertiserGst: advertiser.gstNumber || null,
        platformGst: process.env.PLATFORM_GST_NUMBER || null,
        status: "paid",
        issuedAt: new Date(),
        paidAt: new Date(),
      });

      // Link invoice to payment
      await storage.updatePayment(payment.id, { invoiceId: invoice.id });

      // Notify advertiser: payment received
      await storage.createNotification({
        userId: advertiser.id,
        type: "payment_received",
        title: "Payment Confirmed",
        message: `Your payment of ₹${(payment.amount / 100).toLocaleString("en-IN")} for campaign "${campaign?.name || ""}" has been confirmed. Invoice #${invoiceNumber} generated.`,
        data: { campaignId: payment.campaignId, paymentId: payment.id, invoiceId: invoice.id },
        actionUrl: `/advertiser/payments`,
      });

      // Notify all admins: payment received, ready for payout initiation
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "payment_received",
          title: "Advertiser Payment Received",
          message: `Payment of ₹${(payment.amount / 100).toLocaleString("en-IN")} received for campaign "${campaign?.name || ""}". Review and initiate owner payout.`,
          data: { campaignId: payment.campaignId, paymentId: payment.id, advertiserId: advertiser.id },
          actionUrl: `/admin/payments`,
        });
      }

      // Notify screen owner of the specific paid booking
      if (paidBookingId) {
        const paidBooking = await storage.getBooking(paidBookingId);
        if (paidBooking) {
          const screen = await storage.getScreen(paidBooking.screenId);
          if (screen && screen.ownerId) {
            await storage.createNotification({
              userId: screen.ownerId,
              type: "advertiser_payment_received",
              title: "Advertiser Payment Received",
              message: `Advertiser payment of ₹${(payment.amount / 100).toLocaleString("en-IN")} received for screen "${screen.name}" in campaign "${campaign?.name || ""}". Please confirm your booking.`,
              data: { campaignId: payment.campaignId, bookingId: paidBookingId },
              actionUrl: `/owner/requests`,
            });
          }
        }
      }

      res.json({
        success: true,
        paymentId: payment.id,
        invoiceId: invoice.id,
        invoiceNumber,
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  // ========== RAZORPAY WEBHOOK (public — no auth, Razorpay calls this) ==========

  /**
   * POST /api/webhooks/razorpay
   * Razorpay webhook endpoint. Must be public (no authentication middleware).
   * Raw body is captured by the express.json verify callback in index.ts (req.rawBody).
   *
   * Handled events:
   *   payment.captured  → mark payment completed, update campaign, generate invoice
   *   payment.failed    → mark payment failed
   *   refund.created    → notify advertiser of refund
   *   order.paid        → idempotent log
   *
   * Configure in Razorpay Dashboard → Settings → Webhooks:
   *   URL: https://pixelspot.in/api/webhooks/razorpay
   *   Events: payment.captured, payment.failed, refund.created, order.paid
   */
  app.post("/api/webhooks/razorpay", async (req, res) => {
    // Acknowledge immediately — Razorpay retries if it doesn't get 200 within 5s
    res.status(200).json({ received: true });

    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"] as string | undefined;
      const rawBody = (req as any).rawBody as string | undefined;

      // If secret is configured, verify the signature
      if (webhookSecret && webhookSecret !== "your_razorpay_webhook_secret") {
        if (!signature || !rawBody) {
          console.warn("⚠️  Razorpay webhook: missing signature or raw body — skipping");
          return;
        }
        const isValid = razorpayService.verifyWebhookSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
          console.warn("⚠️  Razorpay webhook: invalid signature — ignoring event");
          return;
        }
      } else {
        console.warn("⚠️  Razorpay webhook: RAZORPAY_WEBHOOK_SECRET not set — skipping signature check");
      }

      const event = req.body;
      const eventType: string = event?.event || "";
      const payload = event?.payload || {};

      console.log(`📩 Razorpay webhook received: ${eventType}`);

      // ---- payment.captured ----
      if (eventType === "payment.captured") {
        const payment = payload?.payment?.entity;
        if (!payment) return;

        const orderId: string = payment.order_id;
        const paymentId: string = payment.id;

        const existingPayment = await storage.getPaymentByGatewayOrder(orderId);
        if (!existingPayment) {
          console.warn(`⚠️  Razorpay webhook: no payment record found for order ${orderId}`);
          return;
        }

        // Idempotency — skip if already completed
        if (existingPayment.status === "completed") {
          console.log(`ℹ️  Razorpay webhook: payment ${paymentId} already completed — skipping`);
          return;
        }

        await storage.updatePayment(existingPayment.id, {
          gatewayPaymentId: paymentId,
          status: "completed",
        });

        if (existingPayment.campaignId) {
          await storage.updateCampaign(existingPayment.campaignId, {
            paymentStatus: "advertiser_paid",
          } as any);

          // Notify advertiser
          await storage.createNotification({
            userId: existingPayment.advertiserId,
            type: "payment_received",
            title: "Payment Confirmed (Webhook)",
            message: `Your payment of ₹${(existingPayment.amount / 100).toLocaleString("en-IN")} was confirmed via Razorpay.`,
            data: { paymentId: existingPayment.id, campaignId: existingPayment.campaignId },
            actionUrl: `/advertiser/payments`,
          });

          // Notify all admins
          const admins = await storage.getUsersByRole("admin");
          for (const admin of admins) {
            await storage.createNotification({
              userId: admin.id,
              type: "payment_received",
              title: "Advertiser Payment Confirmed (Webhook)",
              message: `Payment of ₹${(existingPayment.amount / 100).toLocaleString("en-IN")} confirmed via Razorpay webhook. Review and initiate owner payout.`,
              data: { paymentId: existingPayment.id, campaignId: existingPayment.campaignId },
              actionUrl: `/admin/payments`,
            });
          }
        }

        console.log(`✅ Razorpay webhook: payment ${paymentId} marked completed`);
      }

      // ---- payment.failed ----
      else if (eventType === "payment.failed") {
        const payment = payload?.payment?.entity;
        if (!payment) return;

        const orderId: string = payment.order_id;
        const paymentId: string = payment.id;

        const existingPayment = await storage.getPaymentByGatewayOrder(orderId);
        if (!existingPayment) {
          console.warn(`⚠️  Razorpay webhook: no payment record found for order ${orderId}`);
          return;
        }

        if (existingPayment.status !== "completed") {
          await storage.updatePayment(existingPayment.id, {
            gatewayPaymentId: paymentId,
            status: "failed",
          });

          await storage.createNotification({
            userId: existingPayment.advertiserId,
            type: "payment_failed",
            title: "Payment Failed",
            message: `Your payment for campaign was not captured. Please retry.`,
            data: { paymentId: existingPayment.id, campaignId: existingPayment.campaignId },
            actionUrl: `/advertiser/payments`,
          });
        }

        console.log(`❌ Razorpay webhook: payment ${paymentId} marked failed`);
      }

      // ---- refund.created ----
      else if (eventType === "refund.created") {
        const refund = payload?.refund?.entity;
        const payment = payload?.payment?.entity;
        if (!refund) return;

        const orderId: string = payment?.order_id || "";
        const refundId: string = refund.id;
        const refundAmount: number = refund.amount || 0;

        const existingPayment = orderId
          ? await storage.getPaymentByGatewayOrder(orderId)
          : null;

        if (existingPayment) {
          await storage.createNotification({
            userId: existingPayment.advertiserId,
            type: "refund_issued",
            title: "Refund Issued",
            message: `A refund of ₹${(refundAmount / 100).toLocaleString("en-IN")} has been issued. Refund ID: ${refundId}.`,
            data: { paymentId: existingPayment.id, refundId, refundAmount },
            actionUrl: `/advertiser/payments`,
          });
        }

        console.log(`💸 Razorpay webhook: refund ${refundId} of ₹${(refundAmount / 100).toLocaleString("en-IN")} created`);
      }

      // ---- order.paid ----
      else if (eventType === "order.paid") {
        const order = payload?.order?.entity;
        console.log(`✅ Razorpay webhook: order ${order?.id} fully paid`);
      }

      else {
        console.log(`ℹ️  Razorpay webhook: unhandled event type "${eventType}" — ignored`);
      }
    } catch (err) {
      console.error("❌ Razorpay webhook processing error:", err);
      // Response already sent — just log
    }
  });

  // Get advertiser's payments
  app.get("/api/advertiser/payments", authenticate, requireRole("advertiser", "agency"), async (req, res) => {
    try {
      const payments = await storage.getPaymentsByAdvertiser(req.user!.id);
      res.json(payments);
    } catch (error) {
      console.error("Get advertiser payments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get advertiser's invoices
  app.get("/api/advertiser/invoices", authenticate, requireRole("advertiser", "agency"), async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByAdvertiser(req.user!.id);
      res.json(invoices);
    } catch (error) {
      console.error("Get advertiser invoices error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== ADMIN PAYMENT MANAGEMENT ==========

  // Get all payments (admin)
  app.get("/api/admin/payments", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error("Get all payments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all invoices (admin)
  app.get("/api/admin/invoices", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Get all invoices error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== OWNER PAYOUT ROUTES ==========

  // Admin: initiate payout to screen owner
  app.post("/api/admin/payouts/initiate", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { bookingId, campaignId, screenId, ownerId, payoutAmount, platformCommission, adminNotes } = req.body;
      if (!bookingId || !ownerId || !payoutAmount) {
        return res.status(400).json({ error: "bookingId, ownerId, and payoutAmount are required" });
      }

      // Verify booking exists and is paid
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Get campaign payment status
      if (booking.campaignId) {
        const campaign = await storage.getCampaign(booking.campaignId);
        if (!campaign || campaign.paymentStatus !== "advertiser_paid") {
          return res.status(400).json({ error: "Advertiser payment not yet received for this campaign" });
        }
      }

      // Count existing payouts for this booking to determine payout number
      const existingPayouts = await storage.getOwnerPayoutsByBooking(bookingId);
      const payoutNumber = existingPayouts.length + 1;

      // Calculate total owed
      const totalOwnerAmount = booking.price || 0;

      const payout = await storage.createOwnerPayout({
        bookingId,
        ownerId,
        campaignId: campaignId || booking.campaignId,
        screenId: screenId || booking.screenId,
        totalOwnerAmount,
        payoutAmount: Math.round(payoutAmount),
        platformCommission: Math.round(platformCommission || 0),
        payoutNumber,
        status: "initiated",
        adminInitiatedBy: req.user!.id,
        adminInitiatedAt: new Date(),
        adminNotes: adminNotes || null,
      });

      // Create notification for owner: payout incoming
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now
      await storage.updateOwnerPayout(payout.id, {
        status: "pending_owner_accept",
        expiresAt,
      });

      const screen = await storage.getScreen(payout.screenId);
      const campaign = await storage.getCampaign(payout.campaignId);

      await storage.createNotification({
        userId: ownerId,
        type: "payout_incoming",
        title: "Payment Incoming — Action Required",
        message: `A payout of ₹${(payoutAmount / 100).toLocaleString("en-IN")} is ready for screen "${screen?.screenName || ""}". Accept within 5 minutes.`,
        data: { payoutId: payout.id, bookingId, campaignId: payout.campaignId, expiresAt: expiresAt.toISOString() },
        actionUrl: `/owner/payouts`,
      });

      // Update campaign payment status
      if (campaign) {
        const allPayouts = await storage.getOwnerPayoutsByCampaign(campaign.id);
        const totalInitiated = allPayouts.reduce((sum, p) => sum + p.payoutAmount, 0);
        if (totalInitiated >= totalOwnerAmount) {
          await storage.updateCampaign(campaign.id, { paymentStatus: "fully_settled" } as any);
        } else {
          await storage.updateCampaign(campaign.id, { paymentStatus: "partially_released" } as any);
        }
      }

      res.json(payout);
    } catch (error) {
      console.error("Initiate payout error:", error);
      res.status(500).json({ error: "Failed to initiate payout" });
    }
  });

  // Owner: accept payout (5-minute window)
  app.post("/api/owner/payouts/:id/accept", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const payout = await storage.getOwnerPayout(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: "Payout not found" });
      }
      if (payout.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not your payout" });
      }
      if (payout.status !== "pending_owner_accept") {
        return res.status(400).json({ error: `Payout cannot be accepted in status: ${payout.status}` });
      }

      // Check 5-min expiry
      if (payout.expiresAt && new Date() > payout.expiresAt) {
        await storage.updateOwnerPayout(payout.id, { status: "expired" });
        return res.status(400).json({ error: "Payout acceptance window has expired. Admin can regenerate." });
      }

      const updated = await storage.updateOwnerPayout(payout.id, {
        status: "accepted",
        ownerAcceptedAt: new Date(),
      });

      // Notify admin that owner accepted
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "payout_accepted",
          title: "Owner Accepted Payout",
          message: `Screen owner accepted payout #${payout.payoutNumber} of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}. Process the payment.`,
          data: { payoutId: payout.id, ownerId: payout.ownerId },
          actionUrl: `/admin/payouts`,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Accept payout error:", error);
      res.status(500).json({ error: "Failed to accept payout" });
    }
  });

  // Admin: mark payout as processed (payment sent)
  app.post("/api/admin/payouts/:id/mark-processed", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { transactionRef } = req.body;
      const payout = await storage.getOwnerPayout(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: "Payout not found" });
      }
      if (payout.status !== "accepted") {
        return res.status(400).json({ error: `Payout must be in 'accepted' status to mark as processed. Current: ${payout.status}` });
      }

      const updated = await storage.updateOwnerPayout(payout.id, {
        status: "processed",
        processedAt: new Date(),
        transactionRef: transactionRef || null,
      });

      // Create payout invoice for owner
      const invoiceNumber = await storage.getNextInvoiceNumber();
      const subtotal = payout.payoutAmount;
      const gstPercent = 18;
      const gstAmount = Math.round(subtotal * gstPercent / 100);

      await storage.createInvoice({
        invoiceNumber,
        type: "owner_payout",
        ownerId: payout.ownerId,
        campaignId: payout.campaignId,
        bookingId: payout.bookingId,
        payoutId: payout.id,
        subtotal,
        gstPercent,
        gstAmount,
        totalAmount: subtotal + gstAmount,
        status: "paid",
        issuedAt: new Date(),
        paidAt: new Date(),
      });

      // Notify owner: payout processed
      await storage.createNotification({
        userId: payout.ownerId,
        type: "payout_processed",
        title: "Payout Processed",
        message: `Your payout of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")} has been processed.${transactionRef ? ` Ref: ${transactionRef}` : ""}`,
        data: { payoutId: payout.id, transactionRef },
        actionUrl: `/owner/earnings`,
      });

      // Send payout processed email to owner
      const owner = await storage.getUser(payout.ownerId);
      const screen = await storage.getScreen(payout.screenId);
      if (owner && screen) {
        await notificationService.sendPayoutProcessedEmail(
          owner, payout, screen, transactionRef
        ).catch(err => console.error("Failed to send payout processed email:", err));
      }

      res.json(updated);
    } catch (error) {
      console.error("Mark payout processed error:", error);
      res.status(500).json({ error: "Failed to process payout" });
    }
  });

  // Admin: regenerate expired payout
  app.post("/api/admin/payouts/:id/regenerate", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const payout = await storage.getOwnerPayout(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: "Payout not found" });
      }
      if (payout.status !== "expired" && payout.status !== "failed") {
        return res.status(400).json({ error: `Can only regenerate expired or failed payouts. Current: ${payout.status}` });
      }

      // Create new payout with fresh 5-min window
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const updated = await storage.updateOwnerPayout(payout.id, {
        status: "pending_owner_accept",
        expiresAt,
        adminInitiatedBy: req.user!.id,
        adminInitiatedAt: new Date(),
        ownerAcceptedAt: null,
        processedAt: null,
      });

      // Notify owner again
      await storage.createNotification({
        userId: payout.ownerId,
        type: "payout_incoming",
        title: "Payment Request Renewed",
        message: `A renewed payout of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")} is ready. Accept within 5 minutes.`,
        data: { payoutId: payout.id, expiresAt: expiresAt.toISOString() },
        actionUrl: `/owner/payouts`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Regenerate payout error:", error);
      res.status(500).json({ error: "Failed to regenerate payout" });
    }
  });

  // Get all payouts (admin)
  app.get("/api/admin/payouts", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const payouts = await storage.getAllOwnerPayouts();
      res.json(payouts);
    } catch (error) {
      console.error("Get all payouts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get owner's payouts
  app.get("/api/owner/payouts", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const payouts = await storage.getOwnerPayoutsByOwner(req.user!.id);
      res.json(payouts);
    } catch (error) {
      console.error("Get owner payouts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get owner's earnings summary
  app.get("/api/owner/earnings", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const summary = await storage.getOwnerEarningsSummary(req.user!.id);
      const payouts = await storage.getOwnerPayoutsByOwner(req.user!.id);
      const invoices = await storage.getInvoicesByOwner(req.user!.id);
      res.json({ ...summary, recentPayouts: payouts.slice(0, 10), invoices });
    } catch (error) {
      console.error("Get owner earnings error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== CREATIVE UPLOAD & REVIEW ==========

  // Advertiser: upload creative for a campaign
  app.post("/api/advertiser/campaigns/:id/upload-creative",
    authenticate, requireRole("advertiser", "agency"),
    creativeUpload.single("creative"),
    async (req, res) => {
      try {
        const campaignId = req.params.id;
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        if (campaign.advertiserId !== req.user!.id) {
          return res.status(403).json({ error: "Not your campaign" });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No creative file uploaded" });
        }

        // Upload to object storage
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const fileBuffer = req.file.buffer;
        const contentType = req.file.mimetype;

        // Upload file via signed URL
        const uploadResponse = await fetch(uploadURL.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: fileBuffer,
        });

        if (!uploadResponse.ok) {
          return res.status(500).json({ error: "Failed to upload creative file" });
        }

        // Set ACL
        await objectStorageService.putObjectPolicy(uploadURL.objectPath, {
          owner: req.user!.id.toString(),
          visibility: "public",
          entityType: "campaign_creative",
          entityId: campaignId,
        });

        // Get the public URL
        const publicUrl = await objectStorageService.getPublicUrl(uploadURL.objectPath);

        // Determine file type
        const fileType = req.file.mimetype.startsWith("video/") ? "video" : "image";

        // Update campaign
        await storage.updateCampaign(campaignId, {
          creativeFileUrl: publicUrl || uploadURL.objectPath,
          creativeFileType: fileType,
          creativeStatus: "pending",
          creativeRejectionReason: null,
          creativeReviewedBy: null,
          creativeReviewedAt: null,
        } as any);

        res.json({
          success: true,
          creativeFileUrl: publicUrl || uploadURL.objectPath,
          creativeFileType: fileType,
          creativeStatus: "pending",
        });
      } catch (error) {
        console.error("Upload creative error:", error);
        res.status(500).json({ error: "Failed to upload creative" });
      }
    }
  );

  // Owner: approve creative
  app.patch("/api/owner/campaigns/:campaignId/creative/approve",
    authenticate, requireRole("screen_owner"),
    async (req, res) => {
      try {
        const campaignId = req.params.campaignId;
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        // Verify owner has a screen booked for this campaign
        const campaignBookings = await storage.getBookingsByCampaign(campaignId);
        const ownerScreens = await storage.getScreensByOwner(req.user!.id);
        const ownerScreenIds = new Set(ownerScreens.map(s => s.id));
        const hasBookingOnOwnerScreen = campaignBookings.some(b => ownerScreenIds.has(b.screenId));

        if (!hasBookingOnOwnerScreen) {
          return res.status(403).json({ error: "No booking on your screen for this campaign" });
        }

        if (campaign.creativeStatus !== "pending") {
          return res.status(400).json({ error: `Creative cannot be approved in status: ${campaign.creativeStatus}` });
        }

        await storage.updateCampaign(campaignId, {
          creativeStatus: "approved",
          creativeReviewedBy: req.user!.id,
          creativeReviewedAt: new Date(),
          creativeRejectionReason: null,
        } as any);

        // Notify advertiser
        await storage.createNotification({
          userId: campaign.advertiserId,
          type: "creative_approved",
          title: "Creative Approved",
          message: `Your creative for campaign "${campaign.name}" has been approved by the screen owner.`,
          data: { campaignId },
          actionUrl: `/advertiser/campaigns/${campaignId}`,
        });

        // If payment is completed, send creative to owner via email
        if (campaign.paymentStatus === "advertiser_paid" || campaign.paymentStatus === "partially_released" || campaign.paymentStatus === "fully_settled") {
          const advertiser = await storage.getUser(campaign.advertiserId);
          if (advertiser && campaign.creativeFileUrl) {
            // Send creative file link to owner via email
            try {
              await emailService.sendEmail({
                to: req.user!.email,
                subject: `Creative Ready — Campaign: ${campaign.name}`,
                html: `
                  <h2>Campaign Creative Ready</h2>
                  <p>Hi ${req.user!.name},</p>
                  <p>The creative for campaign "<strong>${campaign.name}</strong>" by ${advertiser.companyName || advertiser.name} has been approved and is ready for playback.</p>
                  <p><strong>Creative File:</strong> <a href="${campaign.creativeFileUrl}">Download/View Creative</a></p>
                  <p>File type: ${campaign.creativeFileType || "image"}</p>
                  <br>
                  <p>Thank you,<br>Pixelspot Team</p>
                `,
              });
            } catch (emailErr) {
              console.error("Failed to send creative email to owner:", emailErr);
            }
          }
        }

        const updated = await storage.getCampaign(campaignId);
        res.json(updated);
      } catch (error) {
        console.error("Approve creative error:", error);
        res.status(500).json({ error: "Failed to approve creative" });
      }
    }
  );

  // Owner: reject creative with reason
  app.patch("/api/owner/campaigns/:campaignId/creative/reject",
    authenticate, requireRole("screen_owner"),
    async (req, res) => {
      try {
        const campaignId = req.params.campaignId;
        const { reason } = req.body;
        if (!reason) {
          return res.status(400).json({ error: "Rejection reason is required" });
        }

        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        // Verify owner has a screen booked for this campaign
        const campaignBookings = await storage.getBookingsByCampaign(campaignId);
        const ownerScreens = await storage.getScreensByOwner(req.user!.id);
        const ownerScreenIds = new Set(ownerScreens.map(s => s.id));
        const hasBookingOnOwnerScreen = campaignBookings.some(b => ownerScreenIds.has(b.screenId));

        if (!hasBookingOnOwnerScreen) {
          return res.status(403).json({ error: "No booking on your screen for this campaign" });
        }

        if (campaign.creativeStatus !== "pending") {
          return res.status(400).json({ error: `Creative cannot be rejected in status: ${campaign.creativeStatus}` });
        }

        await storage.updateCampaign(campaignId, {
          creativeStatus: "rejected",
          creativeRejectionReason: reason,
          creativeReviewedBy: req.user!.id,
          creativeReviewedAt: new Date(),
        } as any);

        // Notify advertiser
        await storage.createNotification({
          userId: campaign.advertiserId,
          type: "creative_rejected",
          title: "Creative Rejected",
          message: `Your creative for campaign "${campaign.name}" was rejected. Reason: ${reason}`,
          data: { campaignId, reason },
          actionUrl: `/advertiser/campaigns/${campaignId}`,
        });

        const updated = await storage.getCampaign(campaignId);
        res.json(updated);
      } catch (error) {
        console.error("Reject creative error:", error);
        res.status(500).json({ error: "Failed to reject creative" });
      }
    }
  );

  // ========== NOTIFICATION CENTER ROUTES ==========

  // Get user's notifications
  app.get("/api/notifications", authenticate, requireVerified, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getUserNotifications(req.user!.id, limit);
      const unreadCount = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", authenticate, requireVerified, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark single notification as read
  app.patch("/api/notifications/:id/read", authenticate, requireVerified, async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", authenticate, requireVerified, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== OWNER BANK DETAILS ==========

  // Update owner bank details
  app.patch("/api/owner/bank-details", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { bankAccountName, bankAccountNumber, bankIfscCode, bankName, upiId } = req.body;
      const updated = await storage.updateUser(req.user!.id, {
        bankAccountName,
        bankAccountNumber,
        bankIfscCode,
        bankName,
        upiId,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Update bank details error:", error);
      res.status(500).json({ error: "Failed to update bank details" });
    }
  });

  // ========== PROOF OF PLAY ENDPOINTS ==========

  // Proof upload config
  const proofUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for proof files
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/webm", "video/quicktime",
        "application/pdf", "text/csv", "text/plain",
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Allowed: images, videos, PDF, CSV, text files"));
      }
    },
  });

  // Owner: upload proof of play for a booking
  app.post("/api/owner/bookings/:id/proof",
    authenticate, requireRole("screen_owner"),
    proofUpload.array("files", 10),
    async (req, res) => {
      try {
        const bookingId = req.params.id;
        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          return res.status(404).json({ error: "Booking not found" });
        }

        // Verify owner owns the screen
        const screen = await storage.getScreen(booking.screenId);
        if (!screen || screen.ownerId !== req.user!.id) {
          return res.status(403).json({ error: "Not your booking" });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "At least one proof file is required" });
        }

        // Upload files to object storage  
        const objectStorageService = new ObjectStorageService();
        const privateDir = objectStorageService.getPrivateObjectDir();
        const fileUrls: Array<{ url: string; type: "photo" | "video" | "log"; caption?: string }> = [];

        for (const file of files) {
          try {
            const objectId = crypto.randomUUID();
            const fullPath = `${privateDir}/uploads/${objectId}`;
            // Parse bucket/object from path like "/bucketName/rest/of/path"
            const normalizedPath = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
            const pathParts = normalizedPath.split("/");
            const bucketName = pathParts[1];
            const objectName = pathParts.slice(2).join("/");
            const bucket = objectStorageClient.bucket(bucketName);
            const gcsFile = bucket.file(objectName);

            await gcsFile.save(file.buffer, {
              contentType: file.mimetype,
              resumable: false,
            });

            // Make public
            try {
              await gcsFile.makePublic();
            } catch (e) {
              // Ignore ACL errors — file is still accessible via signed URL
            }

            const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
            const fileType: "photo" | "video" | "log" = file.mimetype.startsWith("video/") ? "video"
              : file.mimetype.startsWith("image/") ? "photo" : "log";

            fileUrls.push({
              url: publicUrl,
              type: fileType,
              caption: file.originalname,
            });
          } catch (uploadErr) {
            console.error("Failed to upload proof file:", file.originalname, uploadErr);
          }
        }

        if (fileUrls.length === 0) {
          return res.status(500).json({ error: "Failed to upload any proof files" });
        }

        const proof = await storage.createProofOfPlay({
          bookingId,
          campaignId: booking.campaignId,
          screenId: booking.screenId,
          ownerId: req.user!.id,
          fileUrls,
          ownerNotes: req.body.notes || null,
          status: "pending",
        });

        // Notify admins that proof has been uploaded
        const admins = await storage.getUsersByRole("admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "proof_uploaded",
            title: "Proof of Play Uploaded",
            message: `Screen owner uploaded proof of play for booking on "${screen.name}". Please verify.`,
            data: { proofId: proof.id, bookingId, screenId: screen.id },
            actionUrl: `/admin/bookings`,
          });
        }

        res.json(proof);
      } catch (error) {
        console.error("Upload proof of play error:", error);
        res.status(500).json({ error: "Failed to upload proof of play" });
      }
    }
  );

  // Owner: get proof of play for their bookings
  app.get("/api/owner/proof-of-play", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const proofs = await storage.getProofOfPlayByOwner(req.user!.id);
      res.json(proofs);
    } catch (error) {
      console.error("Get owner proof of play error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get proof of play for a specific booking (any authenticated user with access)
  app.get("/api/bookings/:id/proof-of-play", authenticate, async (req, res) => {
    try {
      const proofs = await storage.getProofOfPlayByBooking(req.params.id);
      res.json(proofs);
    } catch (error) {
      console.error("Get booking proof of play error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: verify proof of play
  app.patch("/api/admin/proof/:id/verify", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const proof = await storage.getProofOfPlay(req.params.id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }
      if (proof.status !== "pending") {
        return res.status(400).json({ error: `Cannot verify proof in status: ${proof.status}` });
      }

      const { notes } = req.body;
      const updated = await storage.updateProofOfPlay(proof.id, {
        adminVerified: true,
        adminVerifiedBy: req.user!.id,
        adminVerifiedAt: new Date(),
        adminNotes: notes || null,
        status: "admin_verified",
      });

      // Notify advertiser to confirm
      const campaign = await storage.getCampaign(proof.campaignId);
      if (campaign) {
        await storage.createNotification({
          userId: campaign.advertiserId,
          type: "proof_verified",
          title: "Proof of Play Verified — Please Confirm",
          message: `The admin has verified proof of play for your campaign "${campaign.name}". Please review and confirm.`,
          data: { proofId: proof.id, bookingId: proof.bookingId, campaignId: proof.campaignId },
          actionUrl: `/advertiser/campaigns/${campaign.id}`,
        });

        // Email notification
        const advertiser = await storage.getUser(campaign.advertiserId);
        const screen = await storage.getScreen(proof.screenId);
        if (advertiser && screen) {
          await notificationService.sendProofVerifiedEmail(advertiser, campaign, screen, proof).catch(err =>
            console.error("Failed to send proof verified email:", err)
          );
        }
      }

      // Notify owner that proof was verified
      await storage.createNotification({
        userId: proof.ownerId,
        type: "proof_verified",
        title: "Proof of Play Verified by Admin",
        message: `Your proof of play has been verified. Waiting for advertiser confirmation before final payout.`,
        data: { proofId: proof.id, bookingId: proof.bookingId },
        actionUrl: `/owner/earnings`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Verify proof of play error:", error);
      res.status(500).json({ error: "Failed to verify proof of play" });
    }
  });

  // Admin: get all proof of play entries
  app.get("/api/admin/proof-of-play", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const proofs = await storage.getAllProofOfPlay();
      res.json(proofs);
    } catch (error) {
      console.error("Get all proof of play error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Advertiser: confirm proof of play
  app.patch("/api/advertiser/proof/:id/confirm", authenticate, requireRole("advertiser", "agency"), async (req, res) => {
    try {
      const proof = await storage.getProofOfPlay(req.params.id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }
      if (proof.status !== "admin_verified") {
        return res.status(400).json({ error: `Cannot confirm proof in status: ${proof.status}` });
      }

      // Verify advertiser owns the campaign
      const campaign = await storage.getCampaign(proof.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Not your campaign" });
      }

      const { notes } = req.body;
      const updated = await storage.updateProofOfPlay(proof.id, {
        advertiserConfirmed: true,
        advertiserConfirmedAt: new Date(),
        advertiserNotes: notes || null,
        status: "confirmed",
      });

      // Notify admin that proof is confirmed — ready for final payout
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "proof_confirmed",
          title: "Proof of Play Confirmed — Ready for Final Payout",
          message: `Advertiser confirmed proof of play for campaign "${campaign.name}". You can now release the final payout to the screen owner.`,
          data: { proofId: proof.id, bookingId: proof.bookingId, campaignId: proof.campaignId, ownerId: proof.ownerId },
          actionUrl: `/admin/bookings`,
        });
      }

      // Notify owner
      await storage.createNotification({
        userId: proof.ownerId,
        type: "proof_confirmed",
        title: "Proof Confirmed — Final Payout Coming",
        message: `The advertiser has confirmed your proof of play. The admin will release your final payout soon.`,
        data: { proofId: proof.id, bookingId: proof.bookingId },
        actionUrl: `/owner/earnings`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Confirm proof of play error:", error);
      res.status(500).json({ error: "Failed to confirm proof of play" });
    }
  });

  // Advertiser: dispute proof of play
  app.patch("/api/advertiser/proof/:id/dispute", authenticate, requireRole("advertiser", "agency"), async (req, res) => {
    try {
      const proof = await storage.getProofOfPlay(req.params.id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }
      if (proof.status !== "admin_verified") {
        return res.status(400).json({ error: `Cannot dispute proof in status: ${proof.status}` });
      }

      const campaign = await storage.getCampaign(proof.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Not your campaign" });
      }

      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ error: "Dispute reason is required" });
      }

      const updated = await storage.updateProofOfPlay(proof.id, {
        advertiserNotes: notes,
        status: "disputed",
      });

      // Notify admin about dispute
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "proof_disputed",
          title: "Proof of Play Disputed",
          message: `Advertiser disputed proof of play for campaign "${campaign.name}". Reason: ${notes}. Please review and mediate.`,
          data: { proofId: proof.id, bookingId: proof.bookingId, campaignId: proof.campaignId },
          actionUrl: `/admin/bookings`,
        });
      }

      // Notify owner about dispute
      await storage.createNotification({
        userId: proof.ownerId,
        type: "proof_disputed",
        title: "Proof of Play Disputed by Advertiser",
        message: `The advertiser has disputed your proof of play. Reason: ${notes}. The admin will review and mediate.`,
        data: { proofId: proof.id, bookingId: proof.bookingId },
        actionUrl: `/owner/earnings`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Dispute proof of play error:", error);
      res.status(500).json({ error: "Failed to dispute proof of play" });
    }
  });

  // ========== ADMIN PAYOUT CARD ENDPOINTS (per-booking) ==========

  // Admin: get booking payouts overview (enriched with screen, campaign, owner info)
  app.get("/api/admin/booking-payouts", authenticate, requireRole("admin"), async (req, res) => {
    try {
      // Get all bookings with approved/active/completed status that have payments
      const allBookings = await storage.getEnrichedBookings();
      const paidBookings = allBookings.filter((b: any) => {
        // Show bookings where either the individual booking is paid OR the campaign-level status is paid
        if ((b as any).bookingPaymentStatus === "paid") return true;
        const campaign = b.campaign;
        return campaign && ["advertiser_paid", "partially_released", "fully_settled"].includes(campaign.paymentStatus);
      });

      // For each booking, get payouts and proof
      const enrichedPayouts = await Promise.all(
        paidBookings.map(async (b: any) => {
          const payouts = await storage.getOwnerPayoutsByBooking(b.id);
          const proofs = await storage.getProofOfPlayByBooking(b.id);
          return {
            booking: b,
            payouts,
            proofs,
            advanceAmount: b.ownerAdvanceAmount,
            finalAmount: b.ownerFinalAmount,
            totalPaidOut: payouts
              .filter((p: any) => p.status === "processed")
              .reduce((sum: number, p: any) => sum + p.payoutAmount, 0),
          };
        })
      );

      res.json(enrichedPayouts);
    } catch (error) {
      console.error("Get booking payouts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: set advance/final payout amounts for a booking
  app.patch("/api/admin/bookings/:id/payout-amounts", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { ownerAdvanceAmount, ownerFinalAmount } = req.body;
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const updated = await storage.updateBooking(booking.id, {
        ownerAdvanceAmount: ownerAdvanceAmount != null ? Math.round(ownerAdvanceAmount) : null,
        ownerFinalAmount: ownerFinalAmount != null ? Math.round(ownerFinalAmount) : null,
      } as any);

      res.json(updated);
    } catch (error) {
      console.error("Set payout amounts error:", error);
      res.status(500).json({ error: "Failed to set payout amounts" });
    }
  });

  // Admin: initiate payout for a specific booking with type (advance/final)
  app.post("/api/admin/bookings/:id/payout", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { payoutType, payoutAmount, platformCommission, adminNotes } = req.body;

      if (!payoutType || !["advance", "final"].includes(payoutType)) {
        return res.status(400).json({ error: "payoutType must be 'advance' or 'final'" });
      }
      if (!payoutAmount || payoutAmount <= 0) {
        return res.status(400).json({ error: "Valid payoutAmount is required" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const screen = await storage.getScreen(booking.screenId);
      if (!screen || !screen.ownerId) {
        return res.status(400).json({ error: "Screen or owner not found" });
      }

      // If final payout, require confirmed proof of play
      if (payoutType === "final") {
        const proofs = await storage.getProofOfPlayByBooking(bookingId);
        const confirmed = proofs.find(p => p.status === "confirmed");
        if (!confirmed) {
          return res.status(400).json({ error: "Final payout requires confirmed proof of play" });
        }
      }

      // Verify campaign payment
      const campaign = await storage.getCampaign(booking.campaignId);
      if (!campaign || campaign.paymentStatus === "pending") {
        return res.status(400).json({ error: "Advertiser has not paid for this campaign" });
      }

      const existingPayouts = await storage.getOwnerPayoutsByBooking(bookingId);
      const payoutNumber = existingPayouts.length + 1;

      // Find confirmed proof if final
      let proofOfPlayId: string | null = null;
      if (payoutType === "final") {
        const proofs = await storage.getProofOfPlayByBooking(bookingId);
        const confirmed = proofs.find(p => p.status === "confirmed");
        proofOfPlayId = confirmed?.id || null;
      }

      const payout = await storage.createOwnerPayout({
        bookingId,
        ownerId: screen.ownerId,
        campaignId: booking.campaignId,
        screenId: booking.screenId,
        totalOwnerAmount: booking.price || 0,
        payoutAmount: Math.round(payoutAmount),
        platformCommission: Math.round(platformCommission || 0),
        payoutNumber,
        payoutType,
        proofOfPlayId,
        status: "initiated",
        adminInitiatedBy: req.user!.id,
        adminInitiatedAt: new Date(),
        adminNotes: adminNotes || null,
      });

      // Set 5-min acceptance window
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.updateOwnerPayout(payout.id, {
        status: "pending_owner_accept",
        expiresAt,
      });

      // Notify owner
      await storage.createNotification({
        userId: screen.ownerId,
        type: "payout_incoming",
        title: `${payoutType === "advance" ? "Advance" : "Final"} Payment Incoming`,
        message: `A ${payoutType} payout of ₹${(payoutAmount / 100).toLocaleString("en-IN")} is ready for screen "${screen.name}". Accept within 5 minutes.`,
        data: { payoutId: payout.id, bookingId, payoutType, expiresAt: expiresAt.toISOString() },
        actionUrl: `/owner/payouts`,
      });

      // Send email to owner
      const owner = await storage.getUser(screen.ownerId);
      if (owner) {
        await notificationService.sendPayoutIncomingEmail(
          owner, payout, screen, payoutType, expiresAt
        ).catch(err => console.error("Failed to send payout incoming email:", err));
      }

      // Update campaign payment status
      if (campaign) {
        const allPayouts = await storage.getOwnerPayoutsByCampaign(campaign.id);
        const totalInitiated = allPayouts.reduce((sum, p) => sum + p.payoutAmount, 0);
        const totalOwner = booking.price || 0;
        if (totalInitiated >= totalOwner) {
          await storage.updateCampaign(campaign.id, { paymentStatus: "fully_settled" } as any);
        } else {
          await storage.updateCampaign(campaign.id, { paymentStatus: "partially_released" } as any);
        }
      }

      res.json(payout);
    } catch (error) {
      console.error("Admin initiate booking payout error:", error);
      res.status(500).json({ error: "Failed to initiate payout" });
    }
  });
}
