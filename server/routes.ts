import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyToken } from "./firebaseAdmin";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import type { User } from "@shared/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Authentication middleware
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  const decodedToken = await verifyToken(token);

  if (!decodedToken) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const user = await storage.getUserByFirebaseUid(decodedToken.uid);
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  req.user = user;
  next();
}

// Role-based access control middleware
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ========== PUBLIC ROUTES ==========
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ========== AUTHENTICATION ROUTES ==========
  
  // Sign in / Sign up
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { token, email, name } = req.body;

      if (!token || !email || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const decodedToken = await verifyToken(token);
      
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Check if user already exists
      let user = await storage.getUserByFirebaseUid(decodedToken.uid);

      if (!user) {
        // Create new user with default role as advertiser
        user = await storage.createUser({
          firebaseUid: decodedToken.uid,
          email,
          name,
          phone: null,
          role: "advertiser",
          status: "active",
        });
      }

      res.json({ user });
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json(req.user);
  });

  // Sign out
  app.post("/api/auth/signout", (req, res) => {
    res.json({ success: true });
  });

  // ========== OBJECT STORAGE ROUTES ==========
  
  // Get upload URL for file uploads
  app.post("/api/objects/upload", authenticate, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Get upload URL error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update entity with uploaded file (for screens and campaigns)
  app.put("/api/objects/entity", authenticate, async (req, res) => {
    try {
      const { fileURL, entityType } = req.body;

      if (!fileURL || !entityType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileURL,
        {
          owner: req.user!.id.toString(),
          // Public visibility for screen images and campaign creatives
          visibility: "public",
        },
      );

      res.json({ objectPath });
    } catch (error) {
      console.error("Set entity file error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve public objects (no authentication required)
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(filePath);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects (with ACL check)
  app.get("/objects/:objectPath(*)", authenticate, async (req, res) => {
    try {
      const userId = req.user!.id.toString();
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ========== ADMIN ROUTES ==========
  
  // Admin dashboard stats
  app.get("/api/admin/stats", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allScreens = await storage.getAllScreens();
      const allCampaigns = await storage.getAllCampaigns();
      const allBookings = await storage.getAllBookings();

      const totalRevenue = allBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + b.price, 0);

      const pendingScreens = allScreens.filter(s => s.status === "pending").length;
      const pendingBookings = allBookings.filter(b => b.status === "pending").length;
      const activeUsers = allUsers.filter(u => u.status === "active").length;

      res.json({
        totalUsers: allUsers.length,
        totalScreens: allScreens.length,
        totalCampaigns: allCampaigns.length,
        totalRevenue,
        pendingScreens,
        pendingBookings,
        activeUsers,
        growthRate: 15, // Mock growth rate
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:id/role", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!["admin", "screen_owner", "advertiser"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all screens (admin)
  app.get("/api/admin/screens", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const screens = await storage.getAllScreens();
      res.json(screens);
    } catch (error) {
      console.error("Get all screens error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve screen (admin only)
  app.patch("/api/admin/screens/:id/approve", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const screen = await storage.updateScreenStatus(id, "active");
      
      if (!screen) {
        return res.status(404).json({ error: "Screen not found" });
      }

      res.json(screen);
    } catch (error) {
      console.error("Approve screen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== SCREEN OWNER ROUTES ==========
  
  // Owner dashboard stats
  app.get("/api/owner/stats", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const screens = await storage.getScreensByOwner(req.user!.id);
      const pendingBookings = await storage.getPendingBookingsForOwner(req.user!.id);
      
      const activeScreens = screens.filter(s => s.status === "active").length;
      const allBookings = (await Promise.all(
        screens.map(s => storage.getBookingsByScreen(s.id))
      )).flat();
      
      const totalEarnings = allBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + b.price, 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthEarnings = allBookings
        .filter(b => b.status === "completed" && new Date(b.createdAt) >= thisMonth)
        .reduce((sum, b) => sum + b.price, 0);

      res.json({
        totalScreens: screens.length,
        activeScreens,
        pendingRequests: pendingBookings.length,
        totalEarnings,
        thisMonthEarnings,
        totalBookings: allBookings.length,
      });
    } catch (error) {
      console.error("Owner stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get owner's screens
  app.get("/api/owner/screens", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const screens = await storage.getScreensByOwner(req.user!.id);
      res.json(screens);
    } catch (error) {
      console.error("Get owner screens error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create screen (owner)
  app.post("/api/owner/screens", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const screenData = {
        ...req.body,
        ownerId: req.user!.id,
        ownedByAdmin: false,
        status: "pending",
      };

      const screen = await storage.createScreen(screenData);
      res.status(201).json(screen);
    } catch (error) {
      console.error("Create screen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update screen (owner)
  app.patch("/api/owner/screens/:id", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const existingScreen = await storage.getScreen(id);

      if (!existingScreen || existingScreen.ownerId !== req.user!.id) {
        return res.status(404).json({ error: "Screen not found" });
      }

      const screen = await storage.updateScreen(id, req.body);
      res.json(screen);
    } catch (error) {
      console.error("Update screen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete screen (owner)
  app.delete("/api/owner/screens/:id", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const screen = await storage.getScreen(id);

      if (!screen || screen.ownerId !== req.user!.id) {
        return res.status(404).json({ error: "Screen not found" });
      }

      await storage.deleteScreen(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete screen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get pending booking requests (owner)
  app.get("/api/owner/requests", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const bookings = await storage.getPendingBookingsForOwner(req.user!.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get requests error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve booking request (owner)
  app.patch("/api/owner/bookings/:id/approve", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.approveBookingByOwner(id);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Approve booking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== ADVERTISER ROUTES ==========
  
  // Advertiser dashboard stats
  app.get("/api/advertiser/stats", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaignsByAdvertiser(req.user!.id);
      const activeCampaigns = campaigns.filter(c => c.status === "live").length;
      const completedCampaigns = campaigns.filter(c => c.status === "completed").length;
      
      const allBookings = (await Promise.all(
        campaigns.map(c => storage.getBookingsByCampaign(c.id))
      )).flat();
      
      const totalSpent = allBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + b.price, 0);
      
      const pendingBookings = allBookings.filter(b => b.status === "pending").length;

      res.json({
        totalCampaigns: campaigns.length,
        activeCampaigns,
        completedCampaigns,
        totalSpent,
        pendingBookings,
      });
    } catch (error) {
      console.error("Advertiser stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all active screens (for discovery) with filtering
  app.get("/api/screens", authenticate, async (req, res) => {
    try {
      const { city, type, minPrice, maxPrice, pincode } = req.query;
      
      let screens = await storage.getActiveScreens();
      
      // Apply filters
      if (city) {
        screens = screens.filter(s => 
          s.city.toLowerCase().includes((city as string).toLowerCase())
        );
      }
      
      if (type) {
        screens = screens.filter(s => s.type === type);
      }
      
      if (minPrice) {
        const min = parseInt(minPrice as string);
        screens = screens.filter(s => s.pricePerDay >= min);
      }
      
      if (maxPrice) {
        const max = parseInt(maxPrice as string);
        screens = screens.filter(s => s.pricePerDay <= max);
      }
      
      if (pincode) {
        screens = screens.filter(s => s.pincode === pincode);
      }
      
      res.json(screens);
    } catch (error) {
      console.error("Get screens error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get campaigns (advertiser)
  app.get("/api/advertiser/campaigns", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaignsByAdvertiser(req.user!.id);
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create campaign (advertiser)
  app.post("/api/advertiser/campaigns", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const campaignData = {
        ...req.body,
        advertiserId: req.user!.id,
        status: "pending",
      };

      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create booking request (advertiser)
  app.post("/api/advertiser/bookings", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const booking = await storage.createBooking({
        ...req.body,
        status: "pending",
        ownerApproved: false,
        approvedByAdmin: false,
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
