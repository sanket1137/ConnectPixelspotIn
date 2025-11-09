// Reference: blueprint:javascript_database
import { 
  users, screens, campaigns, bookings, payments,
  aiConversations, aiMessages, aiRateLimits,
  type User, type InsertUser, 
  type Screen, type InsertScreen,
  type Campaign, type InsertCampaign,
  type Booking, type InsertBooking,
  type Payment, type InsertPayment,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage,
  type AiRateLimit, type InsertAiRateLimit
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, desc, sql as drizzleSql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMobileNumber(mobileNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  verifyUserEmail(id: string): Promise<User | undefined>;
  verifyUserMobile(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Screen methods
  getScreen(id: string): Promise<Screen | undefined>;
  getScreensByOwner(ownerId: string): Promise<Screen[]>;
  getAllScreens(): Promise<Screen[]>;
  getActiveScreens(): Promise<Screen[]>;
  getApprovedScreens(): Promise<Screen[]>;
  getPublicScreens(): Promise<Screen[]>;
  getDistinctCities(): Promise<string[]>;
  createScreen(screen: InsertScreen): Promise<Screen>;
  updateScreen(id: string, data: Partial<InsertScreen>): Promise<Screen | undefined>;
  updateScreenStatus(id: string, status: string, rejectionReason?: string): Promise<Screen | undefined>;
  deleteScreen(id: string): Promise<boolean>;
  
  // Campaign methods
  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignsByAdvertiser(advertiserId: string): Promise<Campaign[]>;
  getAllCampaigns(): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  updateCampaignStatus(id: string, status: string): Promise<Campaign | undefined>;
  
  // Booking methods
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByScreen(screenId: string): Promise<Booking[]>;
  getBookingsByCampaign(campaignId: string): Promise<Booking[]>;
  getPendingBookingsForOwner(ownerId: string): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  approveBookingByOwner(id: string): Promise<Booking | undefined>;
  rejectBookingByOwner(id: string, reason: string, alternativeDates?: { startDate: string; endDate: string }): Promise<Booking | undefined>;
  approveBookingByAdmin(id: string): Promise<Booking | undefined>;
  rejectBookingByAdmin(id: string, notes: string): Promise<Booking | undefined>;
  acceptAlternativeDates(id: string): Promise<Booking | undefined>;
  updateBookingDates(id: string, startDate: string, endDate: string, adminNotes?: string): Promise<Booking | undefined>;
  
  // Payment methods
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByBooking(bookingId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string): Promise<Payment | undefined>;
  
  // AI Conversation methods
  createConversation(userId: string, websiteUrl?: string, campaignType?: string): Promise<AiConversation>;
  getConversation(id: string): Promise<AiConversation | undefined>;
  getUserConversations(userId: string, limit?: number): Promise<AiConversation[]>;
  updateConversationTitle(id: string, title: string): Promise<AiConversation | undefined>;
  updateConversationWebsiteContext(id: string, websiteContext: string, expiryHours?: number): Promise<AiConversation | undefined>;
  updateConversationStats(id: string, messageCount: number, totalTokens: number): Promise<AiConversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  
  // AI Message methods
  addMessage(conversationId: string, role: "user" | "assistant", content: string, screenRecommendations?: any[], tokensUsed?: number): Promise<AiMessage>;
  getConversationMessages(conversationId: string, limit?: number): Promise<AiMessage[]>;
  getLastNMessages(conversationId: string, n: number): Promise<AiMessage[]>;
  deleteConversationMessages(conversationId: string): Promise<boolean>;
  
  // AI Rate Limiting methods
  checkRateLimit(userId: string, actionType: "message" | "new_conversation", maxCount: number, windowMinutes: number): Promise<boolean>;
  incrementRateLimit(userId: string, actionType: "message" | "new_conversation", windowMinutes: number): Promise<void>;
  cleanupExpiredRateLimits(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByMobileNumber(mobileNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async verifyUserEmail(id: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ emailVerified: true }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async verifyUserMobile(id: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ mobileVerified: true }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Screen methods
  async getScreen(id: string): Promise<Screen | undefined> {
    const [screen] = await db.select().from(screens).where(eq(screens.id, id));
    return screen || undefined;
  }

  async getScreensByOwner(ownerId: string): Promise<Screen[]> {
    return await db.select().from(screens).where(eq(screens.ownerId, ownerId));
  }

  async getAllScreens(): Promise<Screen[]> {
    return await db.select().from(screens).orderBy(desc(screens.createdAt));
  }

  async getActiveScreens(): Promise<Screen[]> {
    return await db.select().from(screens).where(eq(screens.status, "active"));
  }

  async getApprovedScreens(): Promise<Screen[]> {
    // Return screens with 'active' status (available for booking)
    const activeScreens = await db.select().from(screens).where(eq(screens.status, "active"));
    console.log(`   💾 [getApprovedScreens] Found ${activeScreens.length} active screens in database`);
    if (activeScreens.length > 0) {
      console.log(`      Sample cities: ${activeScreens.slice(0, 5).map(s => s.city).join(', ')}`);
    }
    return activeScreens;
  }

  async getPublicScreens(): Promise<Screen[]> {
    // Return only active screens for public viewing
    return await db.select().from(screens).where(eq(screens.status, "active")).orderBy(desc(screens.createdAt));
  }

  async getDistinctCities(): Promise<string[]> {
    // Get distinct cities from active screens
    const result = await db
      .selectDistinct({ city: screens.city })
      .from(screens)
      .where(eq(screens.status, "active"));
    
    return result
      .map(r => r.city)
      .filter((city): city is string => city !== null)
      .sort();
  }

  async createScreen(insertScreen: InsertScreen): Promise<Screen> {
    const [screen] = await db.insert(screens).values(insertScreen).returning();
    return screen;
  }

  async updateScreen(id: string, data: Partial<InsertScreen>): Promise<Screen | undefined> {
    const [screen] = await db.update(screens).set(data).where(eq(screens.id, id)).returning();
    return screen || undefined;
  }

  async updateScreenStatus(id: string, status: string, rejectionReason?: string): Promise<Screen | undefined> {
    const updateData: any = { status };
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    const [screen] = await db.update(screens).set(updateData).where(eq(screens.id, id)).returning();
    return screen || undefined;
  }

  async deleteScreen(id: string): Promise<boolean> {
    const result = await db.delete(screens).where(eq(screens.id, id));
    return true;
  }

  // Campaign methods
  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignsByAdvertiser(advertiserId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.advertiserId, advertiserId)).orderBy(desc(campaigns.createdAt));
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(insertCampaign).returning();
    return campaign;
  }

  async updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db.update(campaigns).set(data).where(eq(campaigns.id, id)).returning();
    return campaign || undefined;
  }

  async updateCampaignStatus(id: string, status: string): Promise<Campaign | undefined> {
    const [campaign] = await db.update(campaigns).set({ status }).where(eq(campaigns.id, id)).returning();
    return campaign || undefined;
  }

  // Booking methods
  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByScreen(screenId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.screenId, screenId));
  }

  async getBookingsByCampaign(campaignId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.campaignId, campaignId));
  }

  async getPendingBookingsForOwner(ownerId: string): Promise<any[]> {
    const ownerScreens = await this.getScreensByOwner(ownerId);
    const screenIds = ownerScreens.map(s => s.id);
    
    if (screenIds.length === 0) return [];
    
    // Fetch ALL bookings for owner's screens (not just pending_owner)
    // This allows owner to see pending, approved, and rejected bookings in separate tabs
    const bookingsList = await db.select().from(bookings).where(
      or(...screenIds.map(id => eq(bookings.screenId, id)))
    ).orderBy(desc(bookings.createdAt));

    // Fetch screen and campaign details for each booking
    const enrichedBookings = await Promise.all(
      bookingsList.map(async (booking) => {
        const screen = await this.getScreen(booking.screenId);
        const campaign = await this.getCampaign(booking.campaignId);
        return {
          ...booking,
          screen,
          campaign,
        };
      })
    );

    return enrichedBookings;
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(insertBooking).returning();
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async approveBookingByOwner(id: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ 
      ownerApproved: true,
      status: "owner_approved"
    }).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async rejectBookingByOwner(id: string, reason: string, alternativeDates?: { startDate: string; endDate: string }): Promise<Booking | undefined> {
    const updateData: any = {
      ownerApproved: false,
      status: "owner_rejected",
      ownerResponse: reason,
      ownerRespondedAt: new Date().toISOString(),
    };

    if (alternativeDates) {
      updateData.alternativeStartDate = alternativeDates.startDate;
      updateData.alternativeEndDate = alternativeDates.endDate;
    }

    const [booking] = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async approveBookingByAdmin(id: string): Promise<Booking | undefined> {
    // Admin can approve bookings regardless of owner approval status
    // This allows admin to bypass screen owner approval if needed
    const [booking] = await db.update(bookings).set({ 
      approvedByAdmin: true,
      ownerApproved: true, // Auto-approve on behalf of owner when admin approves
      status: "approved" 
    }).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async rejectBookingByAdmin(id: string, notes: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ 
      approvedByAdmin: false,
      status: "rejected",
      adminNotes: notes
    }).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async acceptAlternativeDates(id: string): Promise<Booking | undefined> {
    const booking = await this.getBooking(id);
    if (!booking || !booking.alternativeDates) {
      return undefined;
    }

    const altDates = booking.alternativeDates as { startDate: string; endDate: string };
    const [updatedBooking] = await db.update(bookings).set({
      startDate: new Date(altDates.startDate),
      endDate: new Date(altDates.endDate),
      status: "pending_owner",
      ownerResponse: null,
      alternativeDates: null,
      ownerRespondedAt: null,
    }).where(eq(bookings.id, id)).returning();
    return updatedBooking || undefined;
  }

  async updateBookingDates(id: string, startDate: string, endDate: string, adminNotes?: string): Promise<Booking | undefined> {
    const updateData: any = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      adminNotes: adminNotes || null,
    };

    const [booking] = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  // Payment methods
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentByBooking(bookingId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    return payment || undefined;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async updatePaymentStatus(id: string, status: string): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set({ status }).where(eq(payments.id, id)).returning();
    return payment || undefined;
  }

  // AI Conversation methods
  async createConversation(userId: string, websiteUrl?: string, campaignType?: string): Promise<AiConversation> {
    const [conversation] = await db.insert(aiConversations).values({
      userId,
      websiteUrl: websiteUrl || null,
      campaignType: campaignType || null,
      title: null, // Will be set after first message
    }).returning();
    return conversation;
  }

  async getConversation(id: string): Promise<AiConversation | undefined> {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
    return conversation || undefined;
  }

  async getUserConversations(userId: string, limit: number = 50): Promise<AiConversation[]> {
    return await db.select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.lastMessageAt))
      .limit(limit);
  }

  async updateConversationTitle(id: string, title: string): Promise<AiConversation | undefined> {
    const [conversation] = await db.update(aiConversations)
      .set({ title, updatedAt: drizzleSql`NOW()` })
      .where(eq(aiConversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async updateConversationWebsiteContext(id: string, websiteContext: string, expiryHours: number = 24): Promise<AiConversation | undefined> {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expiryHours);
    
    const [conversation] = await db.update(aiConversations)
      .set({ 
        websiteContext, 
        websiteContextExpiry: expiry,
        updatedAt: drizzleSql`NOW()` 
      })
      .where(eq(aiConversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async updateConversationStats(id: string, messageCount: number, totalTokens: number): Promise<AiConversation | undefined> {
    const [conversation] = await db.update(aiConversations)
      .set({ 
        messageCount, 
        totalTokensUsed: totalTokens,
        lastMessageAt: drizzleSql`NOW()`,
        updatedAt: drizzleSql`NOW()` 
      })
      .where(eq(aiConversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async deleteConversation(id: string): Promise<boolean> {
    // Delete messages first (cascade)
    await this.deleteConversationMessages(id);
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
    return true;
  }

  // AI Message methods
  async addMessage(
    conversationId: string, 
    role: "user" | "assistant", 
    content: string, 
    screenRecommendations?: any[], 
    tokensUsed?: number
  ): Promise<AiMessage> {
    const [message] = await db.insert(aiMessages).values({
      conversationId,
      role,
      content,
      screenRecommendations: screenRecommendations || null,
      tokensUsed: tokensUsed || null,
    }).returning();
    
    // Update conversation's lastMessageAt
    await db.update(aiConversations)
      .set({ lastMessageAt: drizzleSql`NOW()`, updatedAt: drizzleSql`NOW()` })
      .where(eq(aiConversations.id, conversationId));
    
    return message;
  }

  async getConversationMessages(conversationId: string, limit: number = 100): Promise<AiMessage[]> {
    return await db.select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt)
      .limit(limit);
  }

  async getLastNMessages(conversationId: string, n: number): Promise<AiMessage[]> {
    const messages = await db.select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(n);
    
    // Reverse to get chronological order
    return messages.reverse();
  }

  async deleteConversationMessages(conversationId: string): Promise<boolean> {
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));
    return true;
  }

  // Admin AI Conversation methods
  async getAllConversationsWithUsers(limit: number = 100): Promise<any[]> {
    const conversations = await db.select({
      id: aiConversations.id,
      userId: aiConversations.userId,
      userName: users.name,
      userEmail: users.email,
      title: aiConversations.title,
      websiteUrl: aiConversations.websiteUrl,
      campaignType: aiConversations.campaignType,
      messageCount: aiConversations.messageCount,
      totalTokensUsed: aiConversations.totalTokensUsed,
      lastMessageAt: aiConversations.lastMessageAt,
      createdAt: aiConversations.createdAt,
    })
    .from(aiConversations)
    .leftJoin(users, eq(aiConversations.userId, users.id))
    .orderBy(desc(aiConversations.lastMessageAt))
    .limit(limit);
    
    return conversations;
  }

  async getConversationAnalytics(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    activeUsersCount: number;
    averageMessagesPerConversation: number;
    conversationsToday: number;
    conversationsThisWeek: number;
    conversationsThisMonth: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [stats] = await db.select({
      totalConversations: drizzleSql<number>`COUNT(*)::int`,
      totalMessages: drizzleSql<number>`COALESCE(SUM(${aiConversations.messageCount}), 0)::int`,
      totalTokens: drizzleSql<number>`COALESCE(SUM(${aiConversations.totalTokensUsed}), 0)::int`,
      activeUsersCount: drizzleSql<number>`COUNT(DISTINCT ${aiConversations.userId})::int`,
    })
    .from(aiConversations);

    const [todayCount] = await db.select({
      count: drizzleSql<number>`COUNT(*)::int`,
    })
    .from(aiConversations)
    .where(gte(aiConversations.createdAt, today));

    const [weekCount] = await db.select({
      count: drizzleSql<number>`COUNT(*)::int`,
    })
    .from(aiConversations)
    .where(gte(aiConversations.createdAt, weekAgo));

    const [monthCount] = await db.select({
      count: drizzleSql<number>`COUNT(*)::int`,
    })
    .from(aiConversations)
    .where(gte(aiConversations.createdAt, monthAgo));

    return {
      totalConversations: stats.totalConversations || 0,
      totalMessages: stats.totalMessages || 0,
      totalTokens: stats.totalTokens || 0,
      activeUsersCount: stats.activeUsersCount || 0,
      averageMessagesPerConversation: stats.totalConversations > 0 
        ? Math.round((stats.totalMessages || 0) / stats.totalConversations) 
        : 0,
      conversationsToday: todayCount.count || 0,
      conversationsThisWeek: weekCount.count || 0,
      conversationsThisMonth: monthCount.count || 0,
    };
  }

  // AI Rate Limiting methods
  async checkRateLimit(
    userId: string, 
    actionType: "message" | "new_conversation", 
    maxCount: number, 
    windowMinutes: number
  ): Promise<boolean> {
    // Clean up expired limits first
    await this.cleanupExpiredRateLimits();
    
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);
    
    // Get all rate limit records for this user and action type within the window
    const limits = await db.select()
      .from(aiRateLimits)
      .where(
        and(
          eq(aiRateLimits.userId, userId),
          eq(aiRateLimits.actionType, actionType),
          gte(aiRateLimits.windowStart, windowStart)
        )
      );
    
    const totalCount = limits.reduce((sum, limit) => sum + limit.count, 0);
    return totalCount < maxCount;
  }

  async incrementRateLimit(
    userId: string, 
    actionType: "message" | "new_conversation", 
    windowMinutes: number
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);
    
    // Find existing rate limit in current window
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - 1); // 1 minute granularity
    
    const [existing] = await db.select()
      .from(aiRateLimits)
      .where(
        and(
          eq(aiRateLimits.userId, userId),
          eq(aiRateLimits.actionType, actionType),
          gte(aiRateLimits.windowStart, windowStart)
        )
      )
      .limit(1);
    
    if (existing) {
      // Increment existing count
      await db.update(aiRateLimits)
        .set({ count: existing.count + 1, expiresAt })
        .where(eq(aiRateLimits.id, existing.id));
    } else {
      // Create new rate limit record
      await db.insert(aiRateLimits).values({
        userId,
        actionType,
        count: 1,
        windowStart: now,
        expiresAt,
      });
    }
  }

  async cleanupExpiredRateLimits(): Promise<void> {
    const now = new Date();
    await db.delete(aiRateLimits).where(lte(aiRateLimits.expiresAt, now));
  }
}

export const storage = new DatabaseStorage();
