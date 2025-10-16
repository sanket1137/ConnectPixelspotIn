import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyToken, auth as firebaseAdmin } from "./firebaseAdmin";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import type { User } from "@shared/schema";
import { db } from "./db";
import { bookings } from "@shared/schema";
import { eq } from "drizzle-orm";

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
      const { token, email, name, role } = req.body;

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
        // Create new user with selected role (or default to advertiser)
        const userRole = role && (role === "screen_owner" || role === "advertiser") 
          ? role 
          : "advertiser";
        
        user = await storage.createUser({
          firebaseUid: decodedToken.uid,
          email,
          name,
          phone: null,
          role: userRole,
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

  // DEV ONLY: Reset all user passwords (remove in production)
  app.post("/api/dev/reset-passwords", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      // Get all users from database
      const users = await storage.getAllUsers();
      const results = [];

      // Update password for each user in Firebase
      for (const user of users) {
        try {
          // Update user to enable email/password authentication
          await firebaseAdmin.updateUser(user.firebaseUid, {
            email: user.email,
            password: password,
            emailVerified: true,
          });
          results.push({ 
            email: user.email, 
            status: "success",
            message: `Password updated to: ${password}` 
          });
        } catch (error: any) {
          results.push({ 
            email: user.email, 
            status: "error", 
            message: error.message 
          });
        }
      }

      res.json({ 
        message: "Password reset completed",
        results 
      });
    } catch (error) {
      console.error("Reset passwords error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

  // Serve objects (public or private with ACL check)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Check if object is public first
      const isPublic = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: undefined,
      });
      
      if (isPublic) {
        // Object is public, serve it
        return objectStorageService.downloadObject(objectFile, res);
      }
      
      // Object is private, check authentication
      if (!req.user) {
        return res.sendStatus(401);
      }
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: req.user.id.toString(),
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

  // Reject screen (admin only)
  app.patch("/api/admin/screens/:id/reject", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const screen = await storage.updateScreenStatus(id, "inactive");
      
      if (!screen) {
        return res.status(404).json({ error: "Screen not found" });
      }

      res.json(screen);
    } catch (error) {
      console.error("Reject screen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all bookings with details (admin)
  app.get("/api/admin/bookings", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      
      // Enrich with screen and campaign details
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const screen = await storage.getScreen(booking.screenId);
          const campaign = await storage.getCampaign(booking.campaignId);
          return {
            ...booking,
            screen,
            campaign,
          };
        })
      );

      res.json(enrichedBookings);
    } catch (error) {
      console.error("Get all bookings error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve booking (admin)
  app.patch("/api/admin/bookings/:id/approve", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.approveBookingByAdmin(id);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Admin approve booking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject booking (admin)
  app.patch("/api/admin/bookings/:id/reject", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const booking = await storage.rejectBookingByAdmin(id, notes);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Admin reject booking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update booking dates (admin)
  app.patch("/api/admin/bookings/:id/update-dates", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate, notes } = req.body;
      
      const booking = await storage.updateBookingDates(id, startDate, endDate, notes);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Admin update booking dates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create screen on behalf of owner (admin)
  app.post("/api/admin/screens/create", authenticate, requireRole("admin"), async (req, res) => {
    try {
      const { ownerId, ...screenData } = req.body;
      
      const screen = await storage.createScreen({
        ...screenData,
        ownerId,
        ownedByAdmin: true,
        status: "active", // Admin-created screens are automatically active
      });
      
      res.status(201).json(screen);
    } catch (error) {
      console.error("Admin create screen error:", error);
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

  // Get single screen by ID (owner)
  app.get("/api/owner/screens/:id", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const screen = await storage.getScreen(id);

      if (!screen || screen.ownerId !== req.user!.id) {
        return res.status(404).json({ error: "Screen not found" });
      }

      res.json(screen);
    } catch (error) {
      console.error("Get screen error:", error);
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

  // Get booking requests with screen and campaign details (owner)
  app.get("/api/owner/booking-requests", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const bookings = await storage.getPendingBookingsForOwner(req.user!.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get booking requests error:", error);
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

  // Reject booking request (owner)
  app.patch("/api/owner/bookings/:id/reject", authenticate, requireRole("screen_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, alternativeDates } = req.body;
      
      const booking = await storage.rejectBookingByOwner(id, reason, alternativeDates);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Reject booking error:", error);
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

  // Get available locations (states and cities from active screens)
  app.get("/api/screens/locations", authenticate, async (req, res) => {
    try {
      const screens = await storage.getActiveScreens();
      
      // Extract unique states and cities
      const statesSet = new Set<string>();
      const citiesByState: Record<string, Set<string>> = {};
      const allCitiesSet = new Set<string>();
      
      screens.forEach(screen => {
        if (screen.state) {
          statesSet.add(screen.state);
          if (!citiesByState[screen.state]) {
            citiesByState[screen.state] = new Set();
          }
          citiesByState[screen.state].add(screen.city);
        }
        allCitiesSet.add(screen.city);
      });
      
      // Convert sets to sorted arrays
      const states = Array.from(statesSet).sort();
      const cities = Object.fromEntries(
        Object.entries(citiesByState).map(([state, citySet]) => [
          state,
          Array.from(citySet).sort()
        ])
      );
      const allCities = Array.from(allCitiesSet).sort();
      
      res.json({ states, cities, allCities });
    } catch (error) {
      console.error("Get locations error:", error);
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
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
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
        status: "pending_owner",
        ownerApproved: false,
        approvedByAdmin: false,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all bookings for advertiser (with screen and campaign details)
  app.get("/api/advertiser/bookings", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaignsByAdvertiser(req.user!.id);
      const campaignIds = campaigns.map(c => c.id);
      
      if (campaignIds.length === 0) {
        return res.json([]);
      }

      const allBookings = (await Promise.all(
        campaignIds.map(id => storage.getBookingsByCampaign(id))
      )).flat();

      // Enrich with screen and campaign details
      const enrichedBookings = await Promise.all(
        allBookings.map(async (booking) => {
          const screen = await storage.getScreen(booking.screenId);
          const campaign = await storage.getCampaign(booking.campaignId);
          return {
            ...booking,
            screen,
            campaign,
          };
        })
      );

      res.json(enrichedBookings);
    } catch (error) {
      console.error("Get advertiser bookings error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get specific campaign with all bookings (advertiser)
  app.get("/api/advertiser/campaigns/:id", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const campaignBookings = await storage.getBookingsByCampaign(id);
      
      // Enrich bookings with screen details
      const enrichedBookings = await Promise.all(
        campaignBookings.map(async (booking) => {
          const screen = await storage.getScreen(booking.screenId);
          return {
            ...booking,
            screen,
          };
        })
      );

      res.json({
        ...campaign,
        bookings: enrichedBookings,
      });
    } catch (error) {
      console.error("Get campaign details error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept alternative dates proposed by screen owner
  app.patch("/api/advertiser/bookings/:id/accept-alternative", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify ownership
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      const campaign = await storage.getCampaign(booking.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedBooking = await storage.acceptAlternativeDates(id);
      res.json(updatedBooking);
    } catch (error) {
      console.error("Accept alternative dates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject alternative dates and keep booking as rejected
  app.patch("/api/advertiser/bookings/:id/reject-alternative", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify ownership
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      const campaign = await storage.getCampaign(booking.campaignId);
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Keep status as owner_rejected but clear alternative dates
      const [updatedBooking] = await db.update(bookings).set({
        alternativeDates: null,
      }).where(eq(bookings.id, id)).returning();
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Reject alternative dates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
