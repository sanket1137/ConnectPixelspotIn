import { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10,
  },
});

export function registerProofOfPlayRoutes(
  app: Express,
  authenticate: (req: Request, res: Response, next: NextFunction) => any,
  requireRole: (role: string) => (req: Request, res: Response, next: NextFunction) => any
) {
  const objectStorageService = new ObjectStorageService();

  // Helper to process uploaded files
  async function processUploadedFiles(files: Express.Multer.File[], userId: string) {
    const fileUrls: Array<{
      url: string;
      type: "photo" | "video" | "pdf" | "excel" | "log";
      originalName: string;
      fileSize: number;
      caption?: string;
      uploadedAt: string;
    }> = [];

    for (const file of files) {
      const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
      const isVideo = file.mimetype.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext);
      const isPdf = file.mimetype === "application/pdf" || ext === "pdf";
      const isExcel =
        file.mimetype.includes("spreadsheet") ||
        file.mimetype.includes("excel") ||
        file.mimetype === "text/csv" ||
        ["xlsx", "xls", "csv"].includes(ext);

      const fileType: "photo" | "video" | "pdf" | "excel" | "log" = isVideo
        ? "video"
        : isPdf
        ? "pdf"
        : isExcel
        ? "excel"
        : "photo";

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file.buffer,
        headers: { "Content-Type": file.mimetype || "application/octet-stream" },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload to storage failed: ${uploadResponse.status}`);
      }

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId.toString(),
        visibility: "public",
      });

      fileUrls.push({
        url: objectPath,
        type: fileType,
        originalName: file.originalname,
        fileSize: file.size,
        caption: file.originalname,
        uploadedAt: new Date().toISOString(),
      });
    }

    return fileUrls;
  }

  // Helper to stream proof files as a zip archive
  async function streamProofArchive(proof: any, bookingName: string, res: Response) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Proof_Of_Play_${bookingName.replace(/[^a-zA-Z0-9-_]/g, "_")}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate ZIP archive" });
      }
    });

    archive.pipe(res);

    // Add a summary text file into the zip
    const summaryText = `PROOF OF PLAY SUMMARY
Campaign ID: ${proof.campaignId}
Booking ID: ${proof.bookingId}
Screen ID: ${proof.screenId}
Status: ${proof.status}
Uploaded By: ${proof.uploadedByRole} (${proof.uploadedBy})
Uploaded At: ${proof.createdAt}
Verified At: ${proof.adminVerifiedAt || "N/A"}
Summary / Notes:
${proof.summary || proof.ownerNotes || "No notes provided."}

Files Included: ${proof.fileUrls?.length || 0}
`;
    archive.append(summaryText, { name: "SUMMARY.txt" });

    // Append each file
    if (proof.fileUrls && Array.isArray(proof.fileUrls)) {
      for (let i = 0; i < proof.fileUrls.length; i++) {
        const item = proof.fileUrls[i];
        const filename = item.originalName || `proof_file_${i + 1}`;
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(item.url);
          archive.append(objectFile.createReadStream(), { name: filename });
        } catch (e) {
          // If not stored in private object path, try fetching via HTTP
          try {
            const resp = await fetch(item.url);
            if (resp.ok) {
              const buf = Buffer.from(await resp.arrayBuffer());
              archive.append(buf, { name: filename });
            }
          } catch (fetchErr) {
            console.warn(`Could not add ${item.url} to archive:`, fetchErr);
          }
        }
      }
    }

    await archive.finalize();
  }

  // ==========================================
  // ADMIN ROUTES
  // ==========================================

  // 1. Get all proof of play records with booking/screen/campaign/advertiser details
  app.get("/api/admin/proof-of-play", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const proofs = await storage.getAllProofOfPlayWithDetails();
      res.json(proofs);
    } catch (error) {
      console.error("Admin get proof-of-play error:", error);
      res.status(500).json({ error: "Failed to fetch proofs of play" });
    }
  });

  // 2. Get 30-day cleanup candidates (bookings ended >30 days ago, not yet purged)
  app.get("/api/admin/proof-of-play/cleanup-candidates", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const candidates = await storage.getProofCleanupCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Get cleanup candidates error:", error);
      res.status(500).json({ error: "Failed to fetch cleanup candidates" });
    }
  });

  // 3. Admin uploads proof for any booking
  app.post("/api/admin/bookings/:id/proof", authenticate, requireRole("admin"), upload.array("files", 10), async (req, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one proof file is required" });
      }

      const fileUrls = await processUploadedFiles(files, req.user!.id);

      // Clean up eligible at 30 days after booking end date
      const cleanupEligibleAt = new Date(new Date(booking.endDate).getTime() + 30 * 24 * 60 * 60 * 1000);

      const proof = await storage.createProofOfPlay({
        bookingId,
        campaignId: booking.campaignId,
        screenId: booking.screenId,
        ownerId: (await storage.getScreen(booking.screenId))?.ownerId || req.user!.id,
        uploadedBy: req.user!.id,
        uploadedByRole: "admin",
        fileUrls,
        summary: req.body.summary || req.body.notes || null,
        ownerNotes: req.body.notes || null,
        adminVerified: true,
        adminVerifiedBy: req.user!.id,
        adminVerifiedAt: new Date(),
        adminNotes: req.body.adminNotes || "Uploaded and verified directly by administrator",
        status: "admin_verified",
        cleanupEligibleAt,
        cleanupStatus: "active",
      });

      // Notify Advertiser
      const campaign = await storage.getCampaign(booking.campaignId);
      if (campaign && campaign.advertiserId) {
        await storage.createNotification({
          userId: campaign.advertiserId,
          type: "campaign_completed",
          title: "Proof of Play Uploaded",
          message: `Official Proof of Play has been uploaded and verified for your booking on campaign '${campaign.name}'.`,
          data: { bookingId, proofId: proof.id, campaignId: campaign.id },
        });
      }

      res.json(proof);
    } catch (error) {
      console.error("Admin upload proof error:", error);
      res.status(500).json({ error: "Failed to upload proof of play" });
    }
  });

  // 4. Admin verifies proof uploaded by screen owner
  app.put("/api/admin/proof-of-play/:id/verify", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;

      const existing = await storage.getProofOfPlay(id);
      if (!existing) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      const updated = await storage.updateProofOfPlay(id, {
        adminVerified: true,
        adminVerifiedBy: req.user!.id,
        adminVerifiedAt: new Date(),
        adminNotes: adminNotes || existing.adminNotes,
        status: "admin_verified",
        updatedAt: new Date(),
      });

      // Notify Advertiser
      const campaign = await storage.getCampaign(existing.campaignId);
      if (campaign && campaign.advertiserId) {
        await storage.createNotification({
          userId: campaign.advertiserId,
          type: "campaign_completed",
          title: "Proof of Play Verified",
          message: `Proof of Play has been verified by admin for campaign '${campaign.name}'. You can now review and confirm the execution.`,
          data: { bookingId: existing.bookingId, proofId: id, campaignId: campaign.id },
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Admin verify proof error:", error);
      res.status(500).json({ error: "Failed to verify proof of play" });
    }
  });

  // 5. Admin purges/cleans files from storage (30-day cleanup approval)
  app.post("/api/admin/proof-of-play/:id/cleanup", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      // Delete each file from object storage
      if (proof.fileUrls && Array.isArray(proof.fileUrls)) {
        for (const file of proof.fileUrls) {
          if (file.url) {
            await objectStorageService.deleteObjectEntityFile(file.url);
          }
        }
      }

      // Preserve textual summary, but mark files as purged
      const updated = await storage.updateProofOfPlay(id, {
        cleanupStatus: "purged",
        cleanedUpAt: new Date(),
        cleanedUpBy: req.user!.id,
        status: "cleaned_up",
        updatedAt: new Date(),
      });

      res.json({ success: true, message: "Storage purged successfully", proof: updated });
    } catch (error) {
      console.error("Clean-up proof error:", error);
      res.status(500).json({ error: "Failed to execute proof cleanup" });
    }
  });

  // 6. Admin snoozes 30-day cleanup
  app.post("/api/admin/proof-of-play/:id/snooze", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const days = parseInt(req.body.days || "30", 10);
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const updated = await storage.updateProofOfPlay(id, {
        cleanupStatus: "snoozed",
        snoozedUntil,
        updatedAt: new Date(),
      });

      res.json({ success: true, proof: updated });
    } catch (error) {
      console.error("Snooze cleanup error:", error);
      res.status(500).json({ error: "Failed to snooze cleanup" });
    }
  });

  // 7. Admin downloads offline archive (ZIP)
  app.get("/api/admin/proof-of-play/:id/archive", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      await streamProofArchive(proof, `Admin_Archive_${proof.bookingId}`, res);
    } catch (error) {
      console.error("Admin download archive error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream archive" });
      }
    }
  });

  // 8. Admin deletes proof of play record
  app.delete("/api/admin/proof-of-play/:id", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      // Clean files
      if (proof.fileUrls && Array.isArray(proof.fileUrls)) {
        for (const file of proof.fileUrls) {
          if (file.url) {
            await objectStorageService.deleteObjectEntityFile(file.url);
          }
        }
      }

      await storage.deleteProofOfPlay(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete proof error:", error);
      res.status(500).json({ error: "Failed to delete proof of play" });
    }
  });

  // ==========================================
  // SCREEN OWNER ROUTES
  // ==========================================

  // 1. Get owner's screen bookings with latest proof info
  app.get("/api/owner/bookings-for-proof", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const bookings = await storage.getOwnerProofBookings(req.user!.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get owner proof bookings error:", error);
      res.status(500).json({ error: "Failed to fetch bookings for proof" });
    }
  });

  // 2. Screen owner uploads proof for a booking
  app.post("/api/owner/bookings/:id/proof", authenticate, requireRole("screen_owner"), upload.array("files", 10), async (req, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Verify screen ownership
      const screen = await storage.getScreen(booking.screenId);
      if (!screen || screen.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized for this booking" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one proof file is required" });
      }

      const fileUrls = await processUploadedFiles(files, req.user!.id);
      const cleanupEligibleAt = new Date(new Date(booking.endDate).getTime() + 30 * 24 * 60 * 60 * 1000);

      const proof = await storage.createProofOfPlay({
        bookingId,
        campaignId: booking.campaignId,
        screenId: booking.screenId,
        ownerId: req.user!.id,
        uploadedBy: req.user!.id,
        uploadedByRole: "screen_owner",
        fileUrls,
        summary: req.body.summary || req.body.notes || null,
        ownerNotes: req.body.notes || null,
        status: "pending",
        cleanupEligibleAt,
        cleanupStatus: "active",
      });

      // Notify Admins
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "campaign_completed",
          title: "New Proof of Play Uploaded",
          message: `Screen Owner uploaded Proof of Play for screen '${screen.name}'. Please review and verify.`,
          data: { bookingId, proofId: proof.id, screenId: screen.id },
        });
      }

      res.json(proof);
    } catch (error) {
      console.error("Owner upload proof error:", error);
      res.status(500).json({ error: "Failed to upload proof of play" });
    }
  });

  // 3. Screen owner edits pending proof
  app.put("/api/owner/proof-of-play/:id", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }
      if (proof.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (proof.status !== "pending") {
        return res.status(400).json({ error: "Cannot edit proof that is already verified or confirmed" });
      }

      const updated = await storage.updateProofOfPlay(id, {
        summary: req.body.summary !== undefined ? req.body.summary : proof.summary,
        ownerNotes: req.body.ownerNotes !== undefined ? req.body.ownerNotes : proof.ownerNotes,
        updatedAt: new Date(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Owner edit proof error:", error);
      res.status(500).json({ error: "Failed to update proof" });
    }
  });

  // ==========================================
  // ADVERTISER ROUTES
  // ==========================================

  // 1. Get advertiser's bookings with proof information
  app.get("/api/advertiser/proof-of-play", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const bookings = await storage.getAdvertiserProofBookings(req.user!.id);
      res.json(bookings);
    } catch (error) {
      console.error("Advertiser get proof-of-play error:", error);
      res.status(500).json({ error: "Failed to fetch proofs of play" });
    }
  });

  // 2. Advertiser confirms proof satisfaction
  app.put("/api/advertiser/proof-of-play/:id/confirm", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      // Verify campaign belongs to advertiser
      const campaign = await storage.getCampaign(proof.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized for this campaign" });
      }

      const updated = await storage.updateProofOfPlay(id, {
        advertiserConfirmed: true,
        advertiserConfirmedAt: new Date(),
        advertiserNotes: req.body.notes || null,
        status: "confirmed",
        updatedAt: new Date(),
      });

      // Notify Screen Owner
      await storage.createNotification({
        userId: proof.ownerId,
        type: "campaign_completed",
        title: "Proof of Play Confirmed! 🎉",
        message: `Advertiser has confirmed and approved the Proof of Play for campaign '${campaign.name}'.`,
        data: { proofId: id, bookingId: proof.bookingId },
      });

      res.json(updated);
    } catch (error) {
      console.error("Confirm proof error:", error);
      res.status(500).json({ error: "Failed to confirm proof" });
    }
  });

  // 3. Advertiser disputes proof
  app.put("/api/advertiser/proof-of-play/:id/dispute", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: "A dispute reason is required" });
      }

      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      const campaign = await storage.getCampaign(proof.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized for this campaign" });
      }

      const updated = await storage.updateProofOfPlay(id, {
        status: "disputed",
        advertiserNotes: reason,
        updatedAt: new Date(),
      });

      // Notify Admin and Owner
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "campaign_completed",
          title: "Proof of Play Disputed ⚠️",
          message: `Advertiser disputed Proof of Play on campaign '${campaign.name}': "${reason}"`,
          data: { proofId: id, bookingId: proof.bookingId },
        });
      }

      await storage.createNotification({
        userId: proof.ownerId,
        type: "campaign_completed",
        title: "Proof of Play Disputed",
        message: `Advertiser raised an issue regarding Proof of Play on campaign '${campaign.name}': "${reason}"`,
        data: { proofId: id, bookingId: proof.bookingId },
      });

      res.json(updated);
    } catch (error) {
      console.error("Dispute proof error:", error);
      res.status(500).json({ error: "Failed to dispute proof" });
    }
  });

  // 4. Advertiser downloads complete ZIP of proof for a screen/booking
  app.get("/api/advertiser/proof-of-play/:id/download-zip", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofOfPlay(id);
      if (!proof) {
        return res.status(404).json({ error: "Proof of play not found" });
      }

      const campaign = await storage.getCampaign(proof.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await streamProofArchive(proof, `${campaign.name}_${proof.bookingId}`, res);
    } catch (error) {
      console.error("Download proof zip error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate ZIP archive" });
      }
    }
  });
}
