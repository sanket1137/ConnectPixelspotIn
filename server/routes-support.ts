import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import multer from "multer";
import { ObjectStorageService } from "./objectStorage";
import crypto from "crypto";
import { objectStorageClient } from "./objectStorage"; // Make sure to export this if not already

export function registerSupportRoutes(app: Express, authenticate: any, requireRole: any, requireVerified: any) {
  // Support file upload config
  const ticketUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for attachments
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/csv", "text/plain",
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Allowed: images, PDF, CSV, text files"));
      }
    },
  });

  // User: Create a support ticket
  app.post("/api/tickets", authenticate, requireVerified, async (req, res) => {
    try {
      const { subject, category, priority } = req.body;
      if (!subject) {
        return res.status(400).json({ error: "Subject is required" });
      }

      const ticket = await storage.createSupportTicket(req.user!.id, {
        subject,
        category,
        priority: priority || "medium",
      });

      // If initial message provided
      if (req.body.message) {
        await storage.addTicketMessage(ticket.id, req.user!.id, req.body.message, []);
      }

      // Notify admins
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "ticket_created",
          title: "New Support Ticket",
          message: `User ${req.user!.name} created a new ticket: "${subject}"`,
          data: { ticketId: ticket.id },
          actionUrl: `/admin/tickets/${ticket.id}`,
        });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Create ticket error:", error);
      res.status(500).json({ error: "Failed to create support ticket" });
    }
  });

  // User: Get all their tickets
  app.get("/api/tickets", authenticate, requireVerified, async (req, res) => {
    try {
      const tickets = await storage.getSupportTicketsByUser(req.user!.id);
      res.json(tickets);
    } catch (error) {
      console.error("Get user tickets error:", error);
      res.status(500).json({ error: "Failed to get support tickets" });
    }
  });

  // Admin: Get all tickets
  app.get("/api/admin/tickets", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const tickets = await storage.getAllSupportTickets();
      // Enrich with user info to save frontend requests
      const enriched = await Promise.all(tickets.map(async t => {
        const user = await storage.getUser(t.userId);
        return { ...t, user: user ? { name: user.name, role: user.role, companyName: user.companyName } : null };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Get all tickets error:", error);
      res.status(500).json({ error: "Failed to get support tickets" });
    }
  });

  // Get specific ticket and its messages
  app.get("/api/tickets/:id", authenticate, requireVerified, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Access control: only owner or admin can view
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const messages = await storage.getTicketMessages(ticket.id);
      
      // Enrich messages with sender info
      const enrichedMessages = await Promise.all(messages.map(async m => {
        const sender = await storage.getUser(m.senderId);
        return { ...m, sender: sender ? { name: sender.name, role: sender.role } : null };
      }));

      // If admin, fetch full user profile for sidebar
      let userProfile = null;
      if (req.user!.role === "admin") {
        userProfile = await storage.getUser(ticket.userId);
      }

      res.json({ ticket, messages: enrichedMessages, userProfile });
    } catch (error) {
      console.error("Get ticket details error:", error);
      res.status(500).json({ error: "Failed to get ticket details" });
    }
  });

  // Add message to ticket (User or Admin)
  app.post("/api/tickets/:id/messages", authenticate, requireVerified, ticketUpload.array("files", 5), async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const message = req.body.message;
      if (!message && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ error: "Message or attachment is required" });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const fileUrls: Array<{ url: string; name: string; type: string }> = [];

      if (files.length > 0) {
        const objectStorageService = new ObjectStorageService();
        const privateDir = objectStorageService.getPrivateObjectDir();
        
        for (const file of files) {
          try {
            const objectId = crypto.randomUUID();
            const fullPath = `${privateDir}/tickets/${objectId}`;
            
            const normalizedPath = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
            const pathParts = normalizedPath.split("/");
            const bucketName = pathParts[1];
            const objectName = pathParts.slice(2).join("/");
            
            // Assume objectStorageClient is exported from objectStorage.ts
            // Actually, we'll import it, but we can also use putObject buffer directly if service allows
            // For now, we will assume `objectStorageClient` is accessible.
            const { Storage } = await import('@google-cloud/storage');
            const storageClient = new Storage();
            const bucket = storageClient.bucket(bucketName);
            const gcsFile = bucket.file(objectName);

            await gcsFile.save(file.buffer, {
              contentType: file.mimetype,
              resumable: false,
            });

            try {
              await gcsFile.makePublic();
            } catch (e) {
              // Ignore ACL errors if uniform bucket level access is enabled
            }

            const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
            
            fileUrls.push({
              url: publicUrl,
              name: file.originalname,
              type: file.mimetype,
            });
          } catch (uploadErr) {
            console.error("Failed to upload ticket attachment:", file.originalname, uploadErr);
          }
        }
      }

      const msg = await storage.addTicketMessage(ticket.id, req.user!.id, message || "", fileUrls);
      
      // Auto-reopen ticket if user replies to closed ticket
      if (ticket.status === "closed" && req.user!.role !== "admin") {
        await storage.updateSupportTicket(ticket.id, { status: "open" });
      }

      // Notify the other party
      if (req.user!.role === "admin") {
        await storage.createNotification({
          userId: ticket.userId,
          type: "ticket_reply",
          title: "New Ticket Reply",
          message: `Admin replied to your ticket: "${ticket.subject}"`,
          data: { ticketId: ticket.id },
          actionUrl: `/tickets/${ticket.id}`,
        });
      } else {
        const admins = await storage.getUsersByRole("admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "ticket_reply",
            title: "New Ticket Reply",
            message: `User replied to ticket: "${ticket.subject}"`,
            data: { ticketId: ticket.id },
            actionUrl: `/admin/tickets/${ticket.id}`,
          });
        }
      }

      res.json(msg);
    } catch (error) {
      console.error("Add ticket message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Admin: Update ticket status
  app.patch("/api/admin/tickets/:id/status", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { status } = req.body;
      if (!["open", "in_progress", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const ticket = await storage.updateSupportTicket(req.params.id, { status });
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Notify user
      await storage.createNotification({
        userId: ticket.userId,
        type: "ticket_status",
        title: "Ticket Status Updated",
        message: `Your ticket "${ticket.subject}" is now ${status.replace("_", " ")}.`,
        data: { ticketId: ticket.id, status },
        actionUrl: `/tickets/${ticket.id}`,
      });

      res.json(ticket);
    } catch (error) {
      console.error("Update ticket status error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });
}
