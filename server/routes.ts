import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyToken, auth as firebaseAdmin } from "./firebaseAdmin";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import type { User } from "@shared/schema";
import { db } from "./db";
import { bookings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getCampaignAdvice } from "./ai-advisor";
import { storeOTP, verifyOTP, sendEmailOTP, sendMobileOTP } from "./otp";
import { notificationService } from "./notifications";

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

  // Get public screens (approved only, no contact info)
  app.get("/api/public/screens", async (req, res) => {
    try {
      const screens = await storage.getPublicScreens();
      
      // Remove owner contact information for public viewing
      const publicScreens = screens.map(screen => ({
        ...screen,
        // Remove sensitive owner info - they'll only see it after booking
        ownerId: undefined,
      }));
      
      res.json(publicScreens);
    } catch (error) {
      console.error("Get public screens error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get distinct cities from approved screens
  app.get("/api/public/cities", async (req, res) => {
    try {
      const cities = await storage.getDistinctCities();
      res.json({ cities, count: cities.length });
    } catch (error) {
      console.error("Get cities error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DEV ONLY: Test mobile OTP sending (no auth required)
  app.post("/api/test/send-mobile-otp", async (req, res) => {
    try {
      const { mobile } = req.body;
      
      if (!mobile) {
        return res.status(400).json({ error: "Mobile number is required" });
      }

      const code = storeOTP(mobile, 'mobile', mobile);
      await sendMobileOTP(mobile, code);

      res.json({ 
        success: true, 
        message: "Mobile OTP sent (check your phone)",
        mobile: mobile,
        otp: code
      });
    } catch (error) {
      console.error("Test mobile OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DEV ONLY: Test email OTP sending (no auth required)
  app.post("/api/test/send-email-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const code = storeOTP(email, 'email', email);
      await sendEmailOTP(email, code);

      res.json({ 
        success: true, 
        message: "Email OTP sent (check your inbox/console)",
        email: email,
        otp: code
      });
    } catch (error) {
      console.error("Test email OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

      // Check if user already exists (by Firebase UID or email)
      let user = await storage.getUserByFirebaseUid(decodedToken.uid);

      // If not found by UID, check by email (for existing email/password users)
      if (!user) {
        user = await storage.getUserByEmail(email);
        
        // If found by email, update their Firebase UID
        if (user) {
          user = await storage.updateUser(user.id, {
            firebaseUid: decodedToken.uid,
          });
        }
      }

      if (!user) {
        // Create new user with selected role (or default to advertiser)
        const userRole = role && (role === "screen_owner" || role === "advertiser") 
          ? role 
          : "advertiser";
        
        // Auto-verify email for Google OAuth users
        const isGoogleUser = decodedToken.firebase?.sign_in_provider === 'google.com';
        
        user = await storage.createUser({
          firebaseUid: decodedToken.uid,
          email,
          emailVerified: isGoogleUser, // Auto-verify for Google OAuth
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

  // Send email OTP (public - for email verification after signup)
  app.post("/api/auth/send-email-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Verify user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't send OTP if already verified
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const code = storeOTP(email, 'email', user.id);
      await sendEmailOTP(email, code);

      res.json({ success: true, message: "OTP sent to email" });
    } catch (error) {
      console.error("Send email OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Verify email OTP (public - for email verification after signup)
  app.post("/api/auth/verify-email-otp", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }

      // Verify user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = verifyOTP(email, code);
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Mark email as verified
      await storage.verifyUserEmail(user.id);

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Verify email OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== OTP VERIFICATION ROUTES ==========

  // Send email OTP
  app.post("/api/otp/send-email", authenticate, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const code = storeOTP(email, 'email', email);
      await sendEmailOTP(email, code);

      res.json({ success: true, message: "OTP sent to email" });
    } catch (error) {
      console.error("Send email OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Verify email OTP
  app.post("/api/otp/verify-email", authenticate, async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }

      const isValid = verifyOTP(email, code);
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Mark email as verified
      await storage.verifyUserEmail(req.user!.id);

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Verify email OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send mobile OTP
  app.post("/api/otp/send-mobile", authenticate, async (req, res) => {
    try {
      const { mobile } = req.body;
      
      if (!mobile) {
        return res.status(400).json({ error: "Mobile number is required" });
      }

      // Check if mobile number is already registered with another user
      const existingUser = await storage.getUserByMobileNumber(mobile);
      if (existingUser && existingUser.id !== req.user!.id) {
        return res.status(400).json({ 
          error: "This mobile number is already registered with another account. Please use a different number or contact support." 
        });
      }

      const code = storeOTP(mobile, 'mobile', mobile);
      await sendMobileOTP(mobile, code);

      res.json({ success: true, message: "OTP sent to mobile" });
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Verify mobile OTP
  app.post("/api/otp/verify-mobile", authenticate, async (req, res) => {
    try {
      const { mobile, code } = req.body;
      
      if (!mobile || !code) {
        return res.status(400).json({ error: "Mobile and code are required" });
      }

      console.log(`🔐 OTP verification attempt for mobile: ${mobile}, user: ${req.user!.id}`);

      // Check if user is already verified
      if (req.user!.mobileVerified) {
        console.log(`✅ User ${req.user!.id} mobile already verified, skipping OTP check`);
        return res.json({ success: true, message: "Mobile verified successfully" });
      }

      const isValid = verifyOTP(mobile, code);
      
      if (!isValid) {
        console.log(`❌ Invalid OTP for mobile: ${mobile}`);
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      console.log(`✅ Valid OTP for mobile: ${mobile}, marking user as verified`);
      
      // Mark mobile as verified
      await storage.verifyUserMobile(req.user!.id);

      console.log(`✅ Mobile verified successfully for user: ${req.user!.id}`);
      res.json({ success: true, message: "Mobile verified successfully" });
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user profile
  app.put("/api/profile", authenticate, async (req, res) => {
    try {
      const { 
        name, 
        companyName, 
        industry, 
        gstNumber, 
        address, 
        city, 
        state, 
        mobileNumber 
      } = req.body;

      // Note: Mobile number validation happens at OTP stage (send-mobile endpoint)
      // By the time we reach here, the mobile number has been verified via OTP
      // So we trust it's valid and available (or already belongs to this user)

      const updateData: any = {};
      if (name) updateData.name = name;
      if (companyName) updateData.companyName = companyName;
      if (industry) updateData.industry = industry;
      if (gstNumber) updateData.gstNumber = gstNumber;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (mobileNumber) updateData.mobileNumber = mobileNumber;

      // Check if profile is complete
      const isComplete = !!(name && mobileNumber && companyName && city && state && address);
      if (isComplete) {
        updateData.profileCompleted = true;
      }

      const user = await storage.updateUser(req.user!.id, updateData);

      res.json({ user });
    } catch (error) {
      console.error("Update profile error:", error);
      // Catch any unexpected database constraint violations
      if (error instanceof Error && error.message.includes("unique constraint")) {
        return res.status(400).json({ 
          error: "A unique constraint was violated. Please check your input and try again." 
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user profile (POST endpoint for Profile page)
  app.post("/api/profile/update", authenticate, async (req, res) => {
    try {
      const { 
        companyName, 
        industry, 
        gstNumber, 
        address, 
        city, 
        state 
      } = req.body;

      const updateData: any = {};
      if (companyName !== undefined) updateData.companyName = companyName;
      if (industry !== undefined) updateData.industry = industry;
      if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;

      const user = await storage.updateUser(req.user!.id, updateData);

      res.json({ user });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send mobile OTP for profile update
  app.post("/api/profile/send-mobile-otp", authenticate, async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      
      if (!mobileNumber) {
        return res.status(400).json({ error: "Mobile number is required" });
      }

      // Validate mobile number format (10 digits)
      if (!/^\d{10}$/.test(mobileNumber)) {
        return res.status(400).json({ error: "Invalid mobile number format" });
      }

      const code = storeOTP(mobileNumber, 'mobile', req.user!.id);
      await sendMobileOTP(mobileNumber, code);

      res.json({ success: true, message: "OTP sent to mobile" });
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Verify mobile OTP and update mobile number
  app.post("/api/profile/verify-mobile-otp", authenticate, async (req, res) => {
    try {
      const { mobileNumber, otp } = req.body;
      
      if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required" });
      }

      const isValid = verifyOTP(mobileNumber, otp);
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Update mobile number and mark as verified
      await storage.updateUser(req.user!.id, {
        mobileNumber,
        mobileVerified: true,
      });

      res.json({ success: true, message: "Mobile verified successfully" });
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

  // DEV ONLY: List all Firebase users
  app.get("/api/dev/firebase-users", async (req, res) => {
    try {
      const listUsersResult = await firebaseAdmin.listUsers(1000);
      const users = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
        providers: user.providerData.map(p => p.providerId),
      }));
      res.json({ 
        count: users.length,
        users 
      });
    } catch (error) {
      console.error("List Firebase users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DEV ONLY: Delete Firebase user by email
  app.delete("/api/dev/firebase-user/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get user by email
      const user = await firebaseAdmin.getUserByEmail(email);
      
      // Delete the user
      await firebaseAdmin.deleteUser(user.uid);
      
      res.json({ 
        success: true,
        message: `Firebase user ${email} (${user.uid}) deleted successfully`,
        deletedUser: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }
      });
    } catch (error: any) {
      console.error("Delete Firebase user error:", error);
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ error: "User not found in Firebase" });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
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

      // Send approval email to screen owner (non-blocking, fire-and-forget)
      if (screen.ownerId) {
        storage.getUser(screen.ownerId)
          .then(owner => {
            if (owner) {
              notificationService.sendScreenApprovalEmail(owner, screen)
                .catch(err => console.warn("Screen approval email failed (non-critical):", err.message));
            }
          })
          .catch(err => console.warn("Failed to get owner for email notification:", err.message));
      }

      // Respond immediately without waiting for email
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
      const { reason } = req.body;
      const screen = await storage.updateScreenStatus(id, "inactive", reason);
      
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
      
      // Enrich with screen, campaign, advertiser, and owner details
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const screen = await storage.getScreen(booking.screenId);
          const campaign = await storage.getCampaign(booking.campaignId);
          
          // Get advertiser and screen owner details
          let advertiser = null;
          let owner = null;
          
          if (campaign) {
            advertiser = await storage.getUser(campaign.advertiserId);
          }
          
          if (screen) {
            owner = await storage.getUser(screen.ownerId);
          }
          
          return {
            ...booking,
            screen,
            campaign,
            advertiser: advertiser ? {
              id: advertiser.id,
              name: advertiser.name,
              email: advertiser.email,
              mobileNumber: advertiser.mobileNumber,
              companyName: advertiser.companyName,
            } : null,
            owner: owner ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              mobileNumber: owner.mobileNumber,
              companyName: owner.companyName,
            } : null,
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

      // Send campaign live notifications to advertiser and screen owner
      const [campaign, screen] = await Promise.all([
        storage.getCampaign(booking.campaignId),
        storage.getScreen(booking.screenId)
      ]);

      if (campaign && screen) {
        const [advertiser, owner] = await Promise.all([
          storage.getUser(campaign.advertiserId),
          storage.getUser(screen.ownerId)
        ]);

        if (advertiser && owner) {
          await notificationService.sendCampaignLiveEmails(
            advertiser,
            owner,
            booking,
            campaign,
            screen
          ).catch(err => console.error("Failed to send campaign live emails:", err));
        }
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

      // Send notifications to advertiser and admin
      const [campaign, screen, admins] = await Promise.all([
        storage.getCampaign(booking.campaignId),
        storage.getScreen(booking.screenId),
        storage.getUsersByRole("admin")
      ]);

      if (campaign && screen && admins.length > 0) {
        const advertiser = await storage.getUser(campaign.advertiserId);
        const owner = req.user!;
        const admin = admins[0];

        if (advertiser) {
          await notificationService.sendBookingOwnerApprovedEmails(
            advertiser,
            owner,
            admin,
            booking,
            campaign,
            screen
          ).catch(err => console.error("Failed to send owner approval emails:", err));
        }
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

      // Send notifications to advertiser and admin
      const [campaign, screen, admins] = await Promise.all([
        storage.getCampaign(booking.campaignId),
        storage.getScreen(booking.screenId),
        storage.getUsersByRole("admin")
      ]);

      if (campaign && screen && admins.length > 0) {
        const advertiser = await storage.getUser(campaign.advertiserId);
        const owner = req.user!;
        const admin = admins[0];

        if (advertiser) {
          // Check if alternative dates were suggested
          if (alternativeDates && alternativeDates.startDate && alternativeDates.endDate) {
            await notificationService.sendAlternativeDatesEmails(
              advertiser,
              owner,
              admin,
              booking,
              campaign,
              screen,
              alternativeDates,
              reason || "Screen owner suggested alternative dates"
            ).catch(err => console.error("Failed to send alternative dates emails:", err));
          } else {
            await notificationService.sendBookingOwnerRejectedEmails(
              advertiser,
              owner,
              admin,
              booking,
              campaign,
              screen,
              reason || "Screen owner declined the booking"
            ).catch(err => console.error("Failed to send rejection emails:", err));
          }
        }
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

  // Get all approved screens (for discovery) with filtering
  app.get("/api/screens", authenticate, async (req, res) => {
    try {
      const { city, type, minPrice, maxPrice, pincode } = req.query;
      
      let screens = await storage.getApprovedScreens();
      
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

  // Get available locations (states and cities from approved screens)
  app.get("/api/screens/locations", authenticate, async (req, res) => {
    try {
      const screens = await storage.getApprovedScreens();
      
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

  // Calculate auto-duration based on budget and screens
  app.post("/api/campaign/calculate-duration", authenticate, async (req, res) => {
    try {
      const { budget, screenIds } = req.body;
      
      if (!budget || !screenIds || screenIds.length === 0) {
        return res.status(400).json({ error: "Budget and screenIds required" });
      }
      
      const screens = await storage.getApprovedScreens();
      const selectedScreens = screens.filter(s => screenIds.includes(s.id));
      
      if (selectedScreens.length === 0) {
        return res.json({ days: 1, screensPerDay: 0 });
      }
      
      // Calculate average screen cost
      const avgCostPerDay = selectedScreens.reduce((sum, s) => sum + s.pricePerDay, 0) / selectedScreens.length;
      
      // Calculate total screen-days available with budget
      const totalScreenDays = Math.floor(budget / avgCostPerDay);
      
      // Favor more screens over longer duration
      // Strategy: Distribute days to maximize reach
      const optimalDays = Math.max(1, Math.floor(totalScreenDays / selectedScreens.length));
      
      res.json({
        days: optimalDays,
        screensPerDay: selectedScreens.length,
        totalScreenDays,
        avgCostPerDay: Math.round(avgCostPerDay),
      });
    } catch (error) {
      console.error("Calculate duration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Calculate reach estimate
  app.post("/api/campaign/calculate-reach", authenticate, async (req, res) => {
    try {
      const { screenIds, duration } = req.body;
      
      if (!screenIds || screenIds.length === 0 || !duration) {
        return res.status(400).json({ error: "ScreenIds and duration required" });
      }
      
      const screens = await storage.getApprovedScreens();
      const selectedScreens = screens.filter(s => screenIds.includes(s.id));
      
      if (selectedScreens.length === 0) {
        return res.json({ reach: 0, impressions: 0 });
      }
      
      // Reach = sum of (footfall × numberOfScreens × duration) for each screen
      const totalReach = selectedScreens.reduce((sum, screen) => {
        const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
        return sum + (screen.avgDailyFootfall * screenMultiplier * duration);
      }, 0);
      
      // Impressions = reach × average dwell time slots
      const avgSlots = selectedScreens.reduce((sum, s) => sum + s.playbackSlotsPerHour, 0) / selectedScreens.length;
      const avgDwellMinutes = selectedScreens.reduce((sum, s) => sum + s.avgDwellTime, 0) / selectedScreens.length;
      const impressions = Math.round(totalReach * (avgDwellMinutes / 60) * avgSlots);
      
      res.json({
        reach: Math.round(totalReach),
        impressions,
        screenCount: selectedScreens.length,
      });
    } catch (error) {
      console.error("Calculate reach error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get screens in area (map + radius OR city search)
  app.get("/api/screens/in-area", authenticate, async (req, res) => {
    try {
      const { lat, lng, radiusKm, city, budget, duration } = req.query;
      
      let screens = await storage.getApprovedScreens();
      
      // Filter by area (map OR city)
      if (lat && lng && radiusKm) {
        // Map-based filtering using Haversine formula
        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        const radius = parseFloat(radiusKm as string);
        
        screens = screens.filter(screen => {
          const R = 6371; // Earth's radius in km
          const screenLat = parseFloat(screen.latitude.toString());
          const screenLng = parseFloat(screen.longitude.toString());
          
          const dLat = (screenLat - latitude) * Math.PI / 180;
          const dLon = (screenLng - longitude) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(latitude * Math.PI / 180) * Math.cos(screenLat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          return distance <= radius;
        });
      } else if (city) {
        // City-based filtering
        screens = screens.filter(s => 
          s.city.toLowerCase() === (city as string).toLowerCase()
        );
      }
      
      // Sort by footfall (descending) for better recommendations
      screens.sort((a, b) => b.avgDailyFootfall - a.avgDailyFootfall);
      
      // Filter by budget if provided: select screens that fit within budget
      if (budget && duration) {
        const budgetAmount = parseInt(budget as string);
        const durationDays = parseInt(duration as string);
        
        console.log(`\n🎯 Budget Filter: Budget=₹${budgetAmount}, Duration=${durationDays} days`);
        console.log(`📊 Total screens in area: ${screens.length}`);
        
        // Greedy algorithm: pick screens sorted by footfall until budget is exhausted
        const selectedScreens: typeof screens = [];
        let remainingBudget = budgetAmount;
        
        for (const screen of screens) {
          const screenCost = screen.pricePerDay * durationDays;
          console.log(`   ${screen.name}: ₹${screenCost} (₹${screen.pricePerDay}/day × ${durationDays}) - ${screenCost <= remainingBudget ? '✅ SELECTED' : '❌ SKIP'} (remaining: ₹${remainingBudget})`);
          
          if (screenCost <= remainingBudget) {
            selectedScreens.push(screen);
            remainingBudget -= screenCost;
          }
        }
        
        console.log(`✅ Selected ${selectedScreens.length} screens, Total cost: ₹${budgetAmount - remainingBudget}, Remaining: ₹${remainingBudget}\n`);
        screens = selectedScreens;
      }
      
      res.json(screens);
    } catch (error) {
      console.error("Get screens in area error:", error);
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

      // Send notification to screen owner and admin
      const [campaign, screen, admins] = await Promise.all([
        storage.getCampaign(booking.campaignId),
        storage.getScreen(booking.screenId),
        storage.getUsersByRole("admin")
      ]);

      if (campaign && screen && admins.length > 0) {
        const advertiser = req.user!;
        const owner = await storage.getUser(screen.ownerId);
        const admin = admins[0]; // Use first admin

        if (owner) {
          await notificationService.sendBookingRequestEmails(
            advertiser,
            owner,
            admin,
            booking,
            campaign,
            screen
          ).catch(err => console.error("Failed to send booking request emails:", err));
        }
      }

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

  // Update campaign (advertiser - only for rejected campaigns)
  app.patch("/api/advertiser/campaigns/:id", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Only allow editing rejected campaigns
      if (campaign.status !== "rejected") {
        return res.status(400).json({ error: "Only rejected campaigns can be edited" });
      }

      const updateData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };

      const updatedCampaign = await storage.updateCampaign(id, updateData);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Resubmit rejected campaign (advertiser)
  app.patch("/api/advertiser/campaigns/:id/resubmit", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      
      if (!campaign || campaign.advertiserId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Only allow resubmitting rejected campaigns
      if (campaign.status !== "rejected") {
        return res.status(400).json({ error: "Only rejected campaigns can be resubmitted" });
      }

      // Reset status to pending and clear rejection reason
      const updatedCampaign = await storage.updateCampaign(id, {
        status: "pending",
        rejectionReason: null,
      });

      res.json(updatedCampaign);
    } catch (error) {
      console.error("Resubmit campaign error:", error);
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

  // ========== AI CAMPAIGN ADVISOR ROUTES ==========

  // AI Campaign Advisor chat endpoint
  app.post("/api/ai/campaign-advisor", authenticate, requireRole("advertiser"), async (req, res) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const result = await getCampaignAdvice(messages, storage);
      res.json(result);
    } catch (error) {
      console.error("AI Campaign Advisor error:", error);
      res.status(500).json({ error: "Failed to get AI advice. Please try again." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
