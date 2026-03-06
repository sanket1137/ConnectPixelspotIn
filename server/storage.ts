// Reference: blueprint:javascript_database
import { 
  users, screens, campaigns, bookings, payments,
  aiConversations, aiMessages, aiRateLimits,
  screenTags, screenTagAssignments,
  type User, type InsertUser, 
  type Screen, type InsertScreen,
  type Campaign, type InsertCampaign,
  type Booking, type InsertBooking,
  type Payment, type InsertPayment,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage,
  type AiRateLimit, type InsertAiRateLimit,
  type ScreenTag, type ScreenTagAssignment
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
  getCityStats(): Promise<{ city: string; screenCount: number }[]>;
  getPublicStats(): Promise<{ totalPhysicalScreens: number; totalCities: number; totalAdvertisers: number }>;
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

  // Screen Tag methods
  getAllMasterTags(): Promise<ScreenTag[]>;
  getActiveMasterTags(): Promise<ScreenTag[]>;
  getScreenTagAssignments(screenId: string): Promise<(ScreenTagAssignment & { tag: ScreenTag })[]>;
  addManualTagAssignment(screenId: string, tagId: string): Promise<ScreenTagAssignment>;
  removeTagAssignment(assignmentId: string): Promise<boolean>;

  // === Optimized aggregate / JOIN methods (replaces N+1 patterns) ===

  // Admin: aggregate counts for dashboard stats (replaces 4x getAll*)
  getAdminDashboardStats(): Promise<{
    totalUsers: number; totalScreens: number; totalCampaigns: number;
    totalRevenue: number; pendingScreens: number; pendingBookings: number;
    activeUsers: number; thisMonthUsers: number; lastMonthUsers: number;
    thisMonthScreens: number; lastMonthScreens: number;
    thisMonthCampaigns: number; lastMonthCampaigns: number;
    thisMonthRevenue: number; lastMonthRevenue: number;
  }>;

  // Admin: chart data via SQL aggregation (replaces 3x getAll*)
  getAdminChartData(): Promise<{
    activeUsersData: { date: string; users: number }[];
    screenProgressData: { status: string; count: number }[];
    advertiserVisitsData: { date: string; visits: number }[];
  }>;

  // Admin: bookings with screen/campaign/user details via JOINs (replaces N+1)
  getEnrichedBookings(): Promise<any[]>;

  // Owner: bookings for owner's screens via JOIN (replaces N+1)
  getOwnerBookingsEnriched(ownerId: string): Promise<any[]>;

  // Owner: aggregate stats via SQL (replaces N screen queries)
  getOwnerDashboardStats(ownerId: string): Promise<{
    totalScreens: number; activeScreens: number; pendingRequests: number;
    totalEarnings: number; thisMonthEarnings: number; totalBookings: number;
  }>;

  // Advertiser: aggregate stats via SQL (replaces N campaign queries)
  getAdvertiserDashboardStats(advertiserId: string): Promise<{
    totalCampaigns: number; activeCampaigns: number; completedCampaigns: number;
    totalSpent: number; pendingBookings: number;
  }>;

  // Advertiser: campaigns with booking stats via JOIN (replaces N+1)
  getCampaignsWithBookingStats(advertiserId: string): Promise<any[]>;

  // Advertiser: bookings with screen/campaign details via JOIN (replaces N+1)
  getAdvertiserBookingsEnriched(advertiserId: string): Promise<any[]>;

  // Advertiser: recent campaigns with screen cities (replaces deeply nested N+1)
  getRecentCampaignsEnriched(advertiserId: string): Promise<any[]>;

  // Screens: filtered at SQL level with optional pagination
  getFilteredScreens(filters: {
    city?: string; type?: string; minPrice?: number; maxPrice?: number;
    pincode?: string; lat?: number; lng?: number; radiusKm?: number;
    limit?: number; offset?: number;
  }): Promise<Screen[]>;

  // Screens: get unique locations from SQL (replaces full table scan)
  getScreenLocations(): Promise<{ states: string[]; citiesByState: Record<string, string[]>; allCities: string[] }>;
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

  async getCityStats(): Promise<{ city: string; screenCount: number }[]> {
    // Get per-city screen counts accounting for multi-screen listings
    const result = await db.execute(drizzleSql`
      SELECT city,
        SUM(CASE WHEN is_multi_screen = true AND number_of_screens IS NOT NULL
                 THEN number_of_screens ELSE 1 END)::int AS screen_count
      FROM screens WHERE status = 'active'
      GROUP BY city ORDER BY screen_count DESC
    `);
    return (result.rows as any[]).map(r => ({
      city: r.city as string,
      screenCount: Number(r.screen_count),
    }));
  }

  async getPublicStats(): Promise<{ totalPhysicalScreens: number; totalCities: number; totalAdvertisers: number }> {
    const screenStats = await db.execute(drizzleSql`
      SELECT
        SUM(CASE WHEN is_multi_screen = true AND number_of_screens IS NOT NULL
                 THEN number_of_screens ELSE 1 END)::int AS total_physical,
        COUNT(DISTINCT city)::int AS total_cities
      FROM screens WHERE status = 'active'
    `);
    const advStats = await db.execute(drizzleSql`
      SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'advertiser'
    `);
    const row = screenStats.rows[0] as any;
    const advRow = advStats.rows[0] as any;
    return {
      totalPhysicalScreens: Number(row?.total_physical || 0),
      totalCities: Number(row?.total_cities || 0),
      totalAdvertisers: Number(advRow?.cnt || 0),
    };
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

  // ── Screen Tag methods ──────────────────

  async getAllMasterTags(): Promise<ScreenTag[]> {
    return await db.select().from(screenTags).orderBy(screenTags.priority);
  }

  async getActiveMasterTags(): Promise<ScreenTag[]> {
    return await db
      .select()
      .from(screenTags)
      .where(eq(screenTags.isActive, true))
      .orderBy(screenTags.priority);
  }

  async getScreenTagAssignments(screenId: string): Promise<(ScreenTagAssignment & { tag: ScreenTag })[]> {
    const rows = await db
      .select({
        id: screenTagAssignments.id,
        screenId: screenTagAssignments.screenId,
        tagId: screenTagAssignments.tagId,
        source: screenTagAssignments.source,
        score: screenTagAssignments.score,
        isPrimary: screenTagAssignments.isPrimary,
        distanceMeters: screenTagAssignments.distanceMeters,
        poiCount: screenTagAssignments.poiCount,
        assignedAt: screenTagAssignments.assignedAt,
        tag: {
          id: screenTags.id,
          slug: screenTags.slug,
          displayName: screenTags.displayName,
          category: screenTags.category,
          description: screenTags.description,
          googlePlaceTypes: screenTags.googlePlaceTypes,
          maxDistanceMeters: screenTags.maxDistanceMeters,
          minPoiCount: screenTags.minPoiCount,
          baseScore: screenTags.baseScore,
          priority: screenTags.priority,
          iconName: screenTags.iconName,
          colorCode: screenTags.colorCode,
          isActive: screenTags.isActive,
          createdAt: screenTags.createdAt,
        },
      })
      .from(screenTagAssignments)
      .innerJoin(screenTags, eq(screenTagAssignments.tagId, screenTags.id))
      .where(eq(screenTagAssignments.screenId, screenId))
      .orderBy(desc(screenTagAssignments.score));

    return rows as (ScreenTagAssignment & { tag: ScreenTag })[];
  }

  async addManualTagAssignment(screenId: string, tagId: string): Promise<ScreenTagAssignment> {
    // Check if already assigned
    const [existing] = await db
      .select()
      .from(screenTagAssignments)
      .where(
        and(
          eq(screenTagAssignments.screenId, screenId),
          eq(screenTagAssignments.tagId, tagId),
        ),
      )
      .limit(1);

    if (existing) {
      // If it was auto, change to manual to preserve it
      if (existing.source === "auto") {
        const [updated] = await db
          .update(screenTagAssignments)
          .set({ source: "manual" })
          .where(eq(screenTagAssignments.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }

    // Find the tag's baseScore for the manual assignment score
    const [tag] = await db.select().from(screenTags).where(eq(screenTags.id, tagId)).limit(1);
    const score = tag?.baseScore ?? 800;

    const [assignment] = await db
      .insert(screenTagAssignments)
      .values({
        screenId,
        tagId,
        source: "manual",
        score,
        isPrimary: false,
      })
      .returning();

    return assignment;
  }

  async removeTagAssignment(assignmentId: string): Promise<boolean> {
    await db.delete(screenTagAssignments).where(eq(screenTagAssignments.id, assignmentId));
    return true;
  }

  // === Optimized aggregate / JOIN methods ===

  async getAdminDashboardStats() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const result = await db.execute(drizzleSql`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE status = 'active') AS active_users,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= ${thisMonth} AND created_at < ${now}) AS this_month_users,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= ${lastMonth} AND created_at < ${thisMonth}) AS last_month_users,
        (SELECT COUNT(*)::int FROM screens) AS total_screens,
        (SELECT COUNT(*)::int FROM screens WHERE status = 'pending') AS pending_screens,
        (SELECT COUNT(*)::int FROM screens WHERE created_at >= ${thisMonth} AND created_at < ${now}) AS this_month_screens,
        (SELECT COUNT(*)::int FROM screens WHERE created_at >= ${lastMonth} AND created_at < ${thisMonth}) AS last_month_screens,
        (SELECT COUNT(*)::int FROM campaigns) AS total_campaigns,
        (SELECT COUNT(*)::int FROM campaigns WHERE created_at >= ${thisMonth} AND created_at < ${now}) AS this_month_campaigns,
        (SELECT COUNT(*)::int FROM campaigns WHERE created_at >= ${lastMonth} AND created_at < ${thisMonth}) AS last_month_campaigns,
        (SELECT COALESCE(SUM(price), 0)::int FROM bookings WHERE status = 'completed') AS total_revenue,
        (SELECT COUNT(*)::int FROM bookings WHERE status = 'owner_approved') AS pending_bookings,
        (SELECT COALESCE(SUM(price), 0)::int FROM bookings WHERE status = 'completed' AND created_at >= ${thisMonth}) AS this_month_revenue,
        (SELECT COALESCE(SUM(price), 0)::int FROM bookings WHERE status = 'completed' AND created_at >= ${lastMonth} AND created_at < ${thisMonth}) AS last_month_revenue
    `);
    const r = result.rows[0] as any;
    return {
      totalUsers: Number(r.total_users), totalScreens: Number(r.total_screens),
      totalCampaigns: Number(r.total_campaigns), totalRevenue: Number(r.total_revenue),
      pendingScreens: Number(r.pending_screens), pendingBookings: Number(r.pending_bookings),
      activeUsers: Number(r.active_users),
      thisMonthUsers: Number(r.this_month_users), lastMonthUsers: Number(r.last_month_users),
      thisMonthScreens: Number(r.this_month_screens), lastMonthScreens: Number(r.last_month_screens),
      thisMonthCampaigns: Number(r.this_month_campaigns), lastMonthCampaigns: Number(r.last_month_campaigns),
      thisMonthRevenue: Number(r.this_month_revenue), lastMonthRevenue: Number(r.last_month_revenue),
    };
  }

  async getAdminChartData() {
    // Active users over last 7 days
    const activeUsersResult = await db.execute(drizzleSql`
      SELECT d::date AS date, COUNT(u.id)::int AS users
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
      LEFT JOIN users u ON u.created_at <= d + INTERVAL '1 day' AND u.status = 'active'
      GROUP BY d::date ORDER BY d::date
    `);
    const activeUsersData = (activeUsersResult.rows as any[]).map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: Number(r.users),
    }));

    // Screen status breakdown
    const screenResult = await db.execute(drizzleSql`
      SELECT status, COUNT(*)::int AS count FROM screens GROUP BY status
    `);
    const statusMap: Record<string, number> = {};
    (screenResult.rows as any[]).forEach(r => { statusMap[r.status] = Number(r.count); });
    const screenProgressData = [
      { status: "Active", count: statusMap["active"] || 0 },
      { status: "Pending", count: statusMap["pending"] || 0 },
      { status: "Inactive", count: statusMap["inactive"] || 0 },
    ];

    // Campaigns created per day (last 7 days)
    const campaignResult = await db.execute(drizzleSql`
      SELECT d::date AS date, COUNT(c.id)::int AS visits
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
      LEFT JOIN campaigns c ON c.created_at::date = d::date
      GROUP BY d::date ORDER BY d::date
    `);
    const advertiserVisitsData = (campaignResult.rows as any[]).map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: Number(r.visits),
    }));

    return { activeUsersData, screenProgressData, advertiserVisitsData };
  }

  async getEnrichedBookings() {
    const result = await db.execute(drizzleSql`
      SELECT
        b.*,
        row_to_json(s.*) AS screen,
        row_to_json(c.*) AS campaign,
        json_build_object(
          'id', adv.id, 'name', adv.name, 'email', adv.email,
          'mobileNumber', adv.mobile_number, 'companyName', adv.company_name
        ) AS advertiser,
        json_build_object(
          'id', own.id, 'name', own.name, 'email', own.email,
          'mobileNumber', own.mobile_number, 'companyName', own.company_name
        ) AS owner
      FROM bookings b
      LEFT JOIN screens s ON s.id = b.screen_id
      LEFT JOIN campaigns c ON c.id = b.campaign_id
      LEFT JOIN users adv ON adv.id = c.advertiser_id
      LEFT JOIN users own ON own.id = s.owner_id
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  async getOwnerBookingsEnriched(ownerId: string) {
    const result = await db.execute(drizzleSql`
      SELECT
        b.*,
        row_to_json(s.*) AS screen,
        row_to_json(c.*) AS campaign
      FROM bookings b
      INNER JOIN screens s ON s.id = b.screen_id AND s.owner_id = ${ownerId}
      LEFT JOIN campaigns c ON c.id = b.campaign_id
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  async getOwnerDashboardStats(ownerId: string) {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const result = await db.execute(drizzleSql`
      SELECT
        (SELECT COUNT(*)::int FROM screens WHERE owner_id = ${ownerId}) AS total_screens,
        (SELECT COUNT(*)::int FROM screens WHERE owner_id = ${ownerId} AND status = 'active') AS active_screens,
        (SELECT COUNT(*)::int FROM bookings b
         INNER JOIN screens s ON s.id = b.screen_id
         WHERE s.owner_id = ${ownerId} AND b.status = 'pending_owner') AS pending_requests,
        (SELECT COALESCE(SUM(b.price), 0)::int FROM bookings b
         INNER JOIN screens s ON s.id = b.screen_id
         WHERE s.owner_id = ${ownerId} AND b.status = 'completed') AS total_earnings,
        (SELECT COALESCE(SUM(b.price), 0)::int FROM bookings b
         INNER JOIN screens s ON s.id = b.screen_id
         WHERE s.owner_id = ${ownerId} AND b.status = 'completed' AND b.created_at >= ${thisMonth}) AS this_month_earnings,
        (SELECT COUNT(*)::int FROM bookings b
         INNER JOIN screens s ON s.id = b.screen_id
         WHERE s.owner_id = ${ownerId}) AS total_bookings
    `);
    const r = result.rows[0] as any;
    return {
      totalScreens: Number(r.total_screens), activeScreens: Number(r.active_screens),
      pendingRequests: Number(r.pending_requests), totalEarnings: Number(r.total_earnings),
      thisMonthEarnings: Number(r.this_month_earnings), totalBookings: Number(r.total_bookings),
    };
  }

  async getAdvertiserDashboardStats(advertiserId: string) {
    const result = await db.execute(drizzleSql`
      SELECT
        (SELECT COUNT(*)::int FROM campaigns WHERE advertiser_id = ${advertiserId}) AS total_campaigns,
        (SELECT COUNT(*)::int FROM campaigns WHERE advertiser_id = ${advertiserId} AND status = 'live') AS active_campaigns,
        (SELECT COUNT(*)::int FROM campaigns WHERE advertiser_id = ${advertiserId} AND status = 'completed') AS completed_campaigns,
        (SELECT COALESCE(SUM(b.price), 0)::int FROM bookings b
         INNER JOIN campaigns c ON c.id = b.campaign_id
         WHERE c.advertiser_id = ${advertiserId} AND b.status = 'completed') AS total_spent,
        (SELECT COUNT(*)::int FROM bookings b
         INNER JOIN campaigns c ON c.id = b.campaign_id
         WHERE c.advertiser_id = ${advertiserId} AND b.status = 'pending') AS pending_bookings
    `);
    const r = result.rows[0] as any;
    return {
      totalCampaigns: Number(r.total_campaigns), activeCampaigns: Number(r.active_campaigns),
      completedCampaigns: Number(r.completed_campaigns), totalSpent: Number(r.total_spent),
      pendingBookings: Number(r.pending_bookings),
    };
  }

  async getCampaignsWithBookingStats(advertiserId: string) {
    const result = await db.execute(drizzleSql`
      SELECT c.*,
        COALESCE(bs.total, 0)::int AS booking_total,
        COALESCE(bs.approved, 0)::int AS booking_approved,
        COALESCE(bs.rejected, 0)::int AS booking_rejected,
        COALESCE(bs.pending, 0)::int AS booking_pending
      FROM campaigns c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE b.status IN ('approved', 'active'))::int AS approved,
          COUNT(*) FILTER (WHERE b.status IN ('owner_rejected', 'rejected'))::int AS rejected,
          COUNT(*) FILTER (WHERE b.status IN ('pending_owner', 'owner_approved'))::int AS pending
        FROM bookings b WHERE b.campaign_id = c.id
      ) bs ON true
      WHERE c.advertiser_id = ${advertiserId}
      ORDER BY c.created_at DESC
    `);
    return (result.rows as any[]).map(r => ({
      ...r,
      bookingStats: {
        total: Number(r.booking_total),
        approved: Number(r.booking_approved),
        rejected: Number(r.booking_rejected),
        pending: Number(r.booking_pending),
      },
    }));
  }

  async getAdvertiserBookingsEnriched(advertiserId: string) {
    const result = await db.execute(drizzleSql`
      SELECT
        b.*,
        row_to_json(s.*) AS screen,
        row_to_json(c.*) AS campaign
      FROM bookings b
      INNER JOIN campaigns c ON c.id = b.campaign_id AND c.advertiser_id = ${advertiserId}
      LEFT JOIN screens s ON s.id = b.screen_id
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  async getRecentCampaignsEnriched(advertiserId: string) {
    const result = await db.execute(drizzleSql`
      SELECT
        c.id, c.name, c.status, c.budget,
        COALESCE(agg.screen_count, 0)::int AS screen_count,
        COALESCE(agg.cities, '') AS cities
      FROM campaigns c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT b.screen_id)::int AS screen_count,
          STRING_AGG(DISTINCT s.city, ', ') AS cities
        FROM bookings b
        LEFT JOIN screens s ON s.id = b.screen_id
        WHERE b.campaign_id = c.id
      ) agg ON true
      WHERE c.advertiser_id = ${advertiserId}
        AND c.status IN ('live', 'approved')
      ORDER BY c.created_at DESC
      LIMIT 5
    `);
    return (result.rows as any[]).map(r => ({
      id: r.id, name: r.name, status: r.status, budget: Number(r.budget),
      screenCount: Number(r.screen_count), cities: r.cities || '',
    }));
  }

  async getFilteredScreens(filters: {
    city?: string; type?: string; minPrice?: number; maxPrice?: number;
    pincode?: string; lat?: number; lng?: number; radiusKm?: number;
    limit?: number; offset?: number;
  }) {
    // Build dynamic conditions using drizzle sql template fragments
    const conditions: ReturnType<typeof drizzleSql>[] = [drizzleSql`status = 'active'`];

    if (filters.city) {
      conditions.push(drizzleSql`LOWER(city) LIKE LOWER(${`%${filters.city}%`})`);
    }
    if (filters.type) {
      conditions.push(drizzleSql`type = ${filters.type}`);
    }
    if (filters.minPrice !== undefined) {
      conditions.push(drizzleSql`price_per_day >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(drizzleSql`price_per_day <= ${filters.maxPrice}`);
    }
    if (filters.pincode) {
      conditions.push(drizzleSql`pincode = ${filters.pincode}`);
    }
    if (filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined) {
      // Bounding box pre-filter for index usage
      const latRad = filters.radiusKm / 111.0;
      const lngRad = filters.radiusKm / (111.0 * Math.cos(filters.lat * Math.PI / 180));
      conditions.push(drizzleSql`latitude::float BETWEEN ${filters.lat - latRad} AND ${filters.lat + latRad}`);
      conditions.push(drizzleSql`longitude::float BETWEEN ${filters.lng - lngRad} AND ${filters.lng + lngRad}`);
      // Precise Haversine distance
      conditions.push(drizzleSql`(
        6371 * acos(
          cos(radians(${filters.lat})) * cos(radians(latitude::float)) *
          cos(radians(longitude::float) - radians(${filters.lng})) +
          sin(radians(${filters.lat})) * sin(radians(latitude::float))
        )
      ) <= ${filters.radiusKm}`);
    }

    const whereClause = drizzleSql.join(conditions, drizzleSql` AND `);
    let query = drizzleSql`SELECT * FROM screens WHERE ${whereClause} ORDER BY avg_daily_footfall DESC`;
    if (filters.limit) {
      query = drizzleSql`${query} LIMIT ${filters.limit}`;
    }
    if (filters.offset) {
      query = drizzleSql`${query} OFFSET ${filters.offset}`;
    }

    const result = await db.execute(query);
    return result.rows as Screen[];
  }

  async getScreenLocations() {
    const result = await db.execute(drizzleSql`
      SELECT DISTINCT state, city FROM screens WHERE status = 'active' ORDER BY state, city
    `);
    const states = new Set<string>();
    const citiesByState: Record<string, string[]> = {};
    const allCities = new Set<string>();

    (result.rows as any[]).forEach(r => {
      if (r.state) {
        states.add(r.state);
        if (!citiesByState[r.state]) citiesByState[r.state] = [];
        citiesByState[r.state].push(r.city);
      }
      allCities.add(r.city);
    });

    return {
      states: Array.from(states).sort(),
      citiesByState,
      allCities: Array.from(allCities).sort(),
    };
  }
}

export const storage = new DatabaseStorage();
