// Reference: blueprint:javascript_database

// ─── Simple in-memory TTL cache for public/read-heavy data ───────────────────
interface CacheEntry<T> { data: T; expiresAt: number; }
class SimpleCache {
  private store = new Map<string, CacheEntry<any>>();
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.data as T;
  }
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }
  invalidate(key: string): void { this.store.delete(key); }
  invalidatePublicScreens(): void {
    for (const key of this.store.keys()) {
      if (key.startsWith('pub:')) this.store.delete(key);
    }
  }
}
export const publicCache = new SimpleCache();
const PUBLIC_SCREENS_TTL = 300_000; // 5 minutes
// ─────────────────────────────────────────────────────────────────────────────

import { 
  users, screens, campaigns, bookings, payments,
  ownerPayouts, invoices, notifications, proofOfPlay,
  aiConversations, aiMessages, aiRateLimits,
  screenTags, screenTagAssignments,
  supportTickets, ticketMessages,
  zones,
  type User, type InsertUser, 
  type Screen, type InsertScreen,
  type Campaign, type InsertCampaign,
  type Booking, type InsertBooking,
  type Payment, type InsertPayment,
  type OwnerPayout, type InsertOwnerPayout,
  type Invoice, type InsertInvoice,
  type Notification, type InsertNotification,
  type ProofOfPlay, type InsertProofOfPlay,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage,
  type AiRateLimit, type InsertAiRateLimit,
  type ScreenTag, type ScreenTagAssignment,
  type SupportTicket, type InsertSupportTicket,
  type TicketMessage, type InsertTicketMessage,
  type ZoneInfo
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, desc, asc, sql as drizzleSql, inArray, isNull, count, like } from "drizzle-orm";
import { normalizeCityName } from "@shared/constants";
import { notifyUser } from "./websocket";

/** Convert a raw DB row (snake_case keys) to camelCase to match drizzle schema types.
 *  Recursively converts nested plain objects (e.g. from row_to_json). */
function mapRowToCamel<T>(row: Record<string, any>): T {
  const mapped: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    const val = row[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      mapped[camelKey] = mapRowToCamel(val);
    } else {
      mapped[camelKey] = val;
    }
  }
  return mapped as T;
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMobileNumber(mobileNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserLogin(id: string, ip: string): Promise<void>;
  verifyUserEmail(id: string): Promise<User | undefined>;
  verifyUserMobile(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Screen methods
  getScreen(id: string): Promise<Screen | undefined>;
  getScreenByShortId(shortId: string): Promise<Screen | undefined>;
  getScreensByOwner(ownerId: string): Promise<Screen[]>;
  getScreensByCity(city: string): Promise<Screen[]>;
  getScreensByCategory(category: string): Promise<Screen[]>;
  getAllScreens(): Promise<Screen[]>;
  getActiveScreens(): Promise<Screen[]>;
  getApprovedScreens(): Promise<Screen[]>;
  getPublicScreens(): Promise<Screen[]>;
  getDistinctCities(): Promise<string[]>;
  getCityStats(): Promise<{ city: string; screenCount: number }[]>;
  getPublicStats(): Promise<{ totalPhysicalScreens: number; totalCities: number; totalAdvertisers: number }>;
  getCityPageData(cityName: string): Promise<{ city: string; totalScreens: number; venueCategories: { name: string; count: number }[]; screens: Screen[] } | null>;
  getCityVenuePageData(cityName: string, venueCategory: string): Promise<{ city: string; venueCategory: string; totalScreens: number; screens: Screen[] } | null>;
  getSitemapData(): Promise<{ cities: string[]; cityVenues: { city: string; venueCategory: string }[]; lastUpdated: Date }>;
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

  // Zone Screen methods
  getZoneForScreen(screenId: string): Promise<ZoneInfo | null>;
  getScreensInZone(zoneName: string): Promise<{ zone: ZoneInfo; screens: Screen[] }>;

  // Owner Payout methods
  createOwnerPayout(payout: InsertOwnerPayout): Promise<OwnerPayout>;
  getOwnerPayout(id: string): Promise<OwnerPayout | undefined>;
  getOwnerPayoutsByOwner(ownerId: string): Promise<OwnerPayout[]>;
  getOwnerPayoutsByBooking(bookingId: string): Promise<OwnerPayout[]>;
  getOwnerPayoutsByCampaign(campaignId: string): Promise<OwnerPayout[]>;
  getAllOwnerPayouts(): Promise<OwnerPayout[]>;
  updateOwnerPayout(id: string, data: Partial<OwnerPayout>): Promise<OwnerPayout | undefined>;
  getExpiredPendingPayouts(): Promise<OwnerPayout[]>;
  getOwnerEarningsSummary(ownerId: string): Promise<{
    totalEarned: number; totalPending: number; totalProcessed: number;
    payoutsCount: number; pendingPayoutsCount: number;
  }>;

  // Invoice methods
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoicesByAdvertiser(advertiserId: string): Promise<Invoice[]>;
  getInvoicesByOwner(ownerId: string): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Proof of Play methods
  createProofOfPlay(proof: InsertProofOfPlay): Promise<ProofOfPlay>;
  getProofOfPlay(id: string): Promise<ProofOfPlay | undefined>;
  getProofOfPlayByBooking(bookingId: string): Promise<ProofOfPlay[]>;
  getProofOfPlayByOwner(ownerId: string): Promise<ProofOfPlay[]>;
  getAllProofOfPlay(): Promise<ProofOfPlay[]>;
  updateProofOfPlay(id: string, data: Partial<ProofOfPlay>): Promise<ProofOfPlay | undefined>;

  // Booking extended methods
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking | undefined>;
  getBookingsWithExpiredPaymentDeadline(): Promise<Booking[]>;

  // Payment extended methods
  getPaymentByCampaign(campaignId: string): Promise<Payment | undefined>;
  getPaymentByGatewayOrder(gatewayOrderId: string): Promise<Payment | undefined>;
  getPaymentsByAdvertiser(advertiserId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined>;

  // Screen availability - count active brand slots for a given date range
  getScreenBrandAvailability(screenId: string, startDate: Date, endDate: Date): Promise<{
    maxBrands: number; bookedBrands: number; availableBrands: number;
  }>;
  checkBookingOverlap(screenId: string, startDate: Date, endDate: Date, excludeBookingId?: string): Promise<number>;

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
  getCampaignsWithBookingStats(advertiserId: string, page?: number, limit?: number): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>;

  // Advertiser: bookings with screen/campaign details via JOIN (replaces N+1)
  getAdvertiserBookingsEnriched(advertiserId: string): Promise<any[]>;

  // Advertiser: recent campaigns with screen cities (replaces deeply nested N+1)
  getRecentCampaignsEnriched(advertiserId: string): Promise<any[]>;

  // Screens: filtered at SQL level with optional pagination
  getFilteredScreens(filters: {
    city?: string; type?: string; minPrice?: number; maxPrice?: number;
    pincode?: string; lat?: number; lng?: number; radiusKm?: number;
    locations?: Array<{ type: 'city' | 'map', lat?: number, lng?: number, radiusKm?: number, city?: string }>;
    venueCategories?: string[]; environmentTypes?: string[];
    environmentTags?: string[]; userIntents?: string[]; locationTags?: string[];
    minBookingDays?: number;
    limit?: number; offset?: number;
    search?: string;
    page?: number; pageSize?: number;
    sortBy?: 'distance' | 'price' | 'popularity' | 'newest';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Screen[] | { screens: Screen[]; total: number }>;

  // Screens: paginated with filters for admin panel
  getScreensPaginated(params: {
    ownerId?: string;
    status?: string;
    city?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<{ screens: Screen[]; total: number }>;

  // Screens: get unique locations from SQL (replaces full table scan)
  getScreenLocations(): Promise<{ states: string[]; citiesByState: Record<string, string[]>; allCities: string[] }>;
  
  // Screens: get unique filter values for the Advanced Builder
  getScreenFilters(): Promise<{ cities: string[]; venueTypes: string[]; environmentTypes: string[]; tags: { id: string; name: string }[]; userIntents: string[]; locationTags: string[] }>;

  // Support Tickets
  createSupportTicket(userId: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket>;
  getSupportTicketsByUser(userId: string): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | undefined>;
  addTicketMessage(ticketId: string, senderId: string, message: string, attachments?: any[]): Promise<TicketMessage>;
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
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

  async updateUserLogin(id: string, ip: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date(), lastLoginIp: ip }).where(eq(users.id, id));
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

  async getScreenByShortId(shortId: string): Promise<Screen | undefined> {
    const [screen] = await db.select().from(screens).where(like(screens.id, shortId + '%'));
    return screen;
  }

  async getScreensByOwner(ownerId: string): Promise<Screen[]> {
    return await db.select().from(screens).where(eq(screens.ownerId, ownerId));
  }

  async getScreensByCity(city: string): Promise<Screen[]> {
    return await db.select().from(screens).where(and(inArray(screens.status, ["active", "approved"]), eq(screens.city, city))).orderBy(desc(screens.createdAt));
  }

  async getScreensByCategory(category: string): Promise<Screen[]> {
    return await db.select().from(screens).where(and(inArray(screens.status, ["active", "approved"]), eq(screens.venueCategory, category))).orderBy(desc(screens.createdAt));
  }

  async getAllScreens(): Promise<Screen[]> {
    return await db.select().from(screens).orderBy(desc(screens.createdAt));
  }

  async getActiveScreens(): Promise<Screen[]> {
    return await db.select().from(screens).where(inArray(screens.status, ["active", "approved"]));
  }

  async getApprovedScreens(): Promise<Screen[]> {
    // Return screens with 'active' or 'approved' status (available for booking)
    const cached = publicCache.get<Screen[]>('pub:approvedScreens');
    if (cached) return cached;
    const activeScreens = await db.select().from(screens).where(inArray(screens.status, ["active", "approved"]));
    console.log(`   💾 [getApprovedScreens] Found ${activeScreens.length} active/approved screens in database`);
    if (activeScreens.length > 0) {
      console.log(`      Sample cities: ${activeScreens.slice(0, 5).map(s => s.city).join(', ')}`);
    }
    publicCache.set('pub:approvedScreens', activeScreens, PUBLIC_SCREENS_TTL);
    return activeScreens;
  }

  async getPublicScreens(): Promise<Screen[]> {
    const cached = publicCache.get<Screen[]>('pub:publicScreens');
    if (cached) return cached;
    const result = await db.select().from(screens).where(inArray(screens.status, ["active", "approved"])).orderBy(desc(screens.createdAt));
    publicCache.set('pub:publicScreens', result, PUBLIC_SCREENS_TTL);
    return result;
  }

  async getDistinctCities(): Promise<string[]> {
    const cached = publicCache.get<string[]>('pub:cities');
    if (cached) return cached;
    const result = await db
      .selectDistinct({ city: screens.city })
      .from(screens)
      .where(inArray(screens.status, ["active", "approved"]));
    const cities = result
      .map(r => r.city)
      .filter((city): city is string => city !== null)
      .sort();
    publicCache.set('pub:cities', cities, PUBLIC_SCREENS_TTL);
    return cities;
  }

  async getCityStats(): Promise<{ city: string; screenCount: number }[]> {
    const cached = publicCache.get<{ city: string; screenCount: number }[]>('pub:cityStats');
    if (cached) return cached;
    const result = await db.execute(drizzleSql`
      SELECT city,
        SUM(CASE WHEN is_multi_screen = true AND number_of_screens IS NOT NULL
                 THEN number_of_screens ELSE 1 END)::int AS screen_count
      FROM screens WHERE status IN ('active', 'approved')
      GROUP BY city ORDER BY screen_count DESC
    `);
    const cityStats = (result.rows as any[]).map(r => ({
      city: r.city as string,
      screenCount: Number(r.screen_count),
    }));
    publicCache.set('pub:cityStats', cityStats, PUBLIC_SCREENS_TTL);
    return cityStats;
  }

  async getPublicStats(): Promise<{ totalPhysicalScreens: number; totalCities: number; totalAdvertisers: number }> {
    const cached = publicCache.get<{ totalPhysicalScreens: number; totalCities: number; totalAdvertisers: number }>('pub:stats');
    if (cached) return cached;
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
    const stats = {
      totalPhysicalScreens: Number(row?.total_physical || 0),
      totalCities: Number(row?.total_cities || 0),
      totalAdvertisers: Number(advRow?.cnt || 0),
    };
    publicCache.set('pub:stats', stats, PUBLIC_SCREENS_TTL);
    return stats;
  }

  async getCityPageData(cityName: string): Promise<{ city: string; totalScreens: number; venueCategories: { name: string; count: number }[]; screens: Screen[] } | null> {
    const canonical = normalizeCityName(cityName);
    const cacheKey = `pub:cityPage:${canonical.toLowerCase()}`;
    const cached = publicCache.get<{ city: string; totalScreens: number; venueCategories: { name: string; count: number }[]; screens: Screen[] }>(cacheKey);
    if (cached) return cached;
    // Case-insensitive city match against canonical + alias spellings
    const rows = await db
      .select()
      .from(screens)
      .where(and(
        eq(screens.status, "active"),
        drizzleSql`LOWER(${screens.city}) = LOWER(${canonical})`
      ))
      .orderBy(desc(screens.createdAt));
    if (rows.length === 0) return null;
    const totalScreens = rows.reduce(
      (sum, r) => sum + (r.isMultiScreen && r.numberOfScreens ? r.numberOfScreens : 1),
      0,
    );
    const venueMap = new Map<string, number>();
    for (const r of rows) {
      const key = r.venueCategory || "Other";
      const inc = r.isMultiScreen && r.numberOfScreens ? r.numberOfScreens : 1;
      venueMap.set(key, (venueMap.get(key) ?? 0) + inc);
    }
    const venueCategories = Array.from(venueMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const data = { city: canonical, totalScreens, venueCategories, screens: rows };
    publicCache.set(cacheKey, data, PUBLIC_SCREENS_TTL);
    return data;
  }

  async getCityVenuePageData(cityName: string, venueCategory: string): Promise<{ city: string; venueCategory: string; totalScreens: number; screens: Screen[] } | null> {
    const canonicalCity = normalizeCityName(cityName);
    const cacheKey = `pub:cityVenue:${canonicalCity.toLowerCase()}:${venueCategory.toLowerCase()}`;
    const cached = publicCache.get<{ city: string; venueCategory: string; totalScreens: number; screens: Screen[] }>(cacheKey);
    if (cached) return cached;
    const rows = await db
      .select()
      .from(screens)
      .where(and(
        eq(screens.status, "active"),
        drizzleSql`LOWER(${screens.city}) = LOWER(${canonicalCity})`,
        drizzleSql`LOWER(${screens.venueCategory}) = LOWER(${venueCategory})`,
      ))
      .orderBy(desc(screens.createdAt));
    if (rows.length === 0) return null;
    const totalScreens = rows.reduce(
      (sum, r) => sum + (r.isMultiScreen && r.numberOfScreens ? r.numberOfScreens : 1),
      0,
    );
    const data = { city: canonicalCity, venueCategory, totalScreens, screens: rows };
    publicCache.set(cacheKey, data, PUBLIC_SCREENS_TTL);
    return data;
  }

  async getSitemapData(): Promise<{ cities: string[]; cityVenues: { city: string; venueCategory: string }[]; lastUpdated: Date }> {
    const cached = publicCache.get<{ cities: string[]; cityVenues: { city: string; venueCategory: string }[]; lastUpdated: Date }>('pub:sitemap');
    if (cached) return cached;
    const cityRows = await db
      .selectDistinct({ city: screens.city })
      .from(screens)
      .where(eq(screens.status, "active"));
    const cities = cityRows
      .map(r => r.city)
      .filter((c): c is string => !!c)
      .sort();
    const pairRows = await db
      .selectDistinct({ city: screens.city, venueCategory: screens.venueCategory })
      .from(screens)
      .where(eq(screens.status, "active"));
    const cityVenues = pairRows
      .filter((r): r is { city: string; venueCategory: string } => !!r.city && !!r.venueCategory)
      .sort((a, b) => a.city.localeCompare(b.city) || a.venueCategory.localeCompare(b.venueCategory));
    const data = { cities, cityVenues, lastUpdated: new Date() };
    publicCache.set('pub:sitemap', data, PUBLIC_SCREENS_TTL);
    return data;
  }

  async createScreen(insertScreen: InsertScreen): Promise<Screen> {
    const [screen] = await db.insert(screens).values(insertScreen).returning();
    publicCache.invalidatePublicScreens();
    return screen;
  }

  async updateScreen(id: string, data: Partial<InsertScreen>): Promise<Screen | undefined> {
    const [screen] = await db.update(screens).set(data).where(eq(screens.id, id)).returning();
    publicCache.invalidatePublicScreens();
    return screen || undefined;
  }

  async updateScreenStatus(id: string, status: string, rejectionReason?: string): Promise<Screen | undefined> {
    const updateData: any = { status };
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    const [screen] = await db.update(screens).set(updateData).where(eq(screens.id, id)).returning();
    publicCache.invalidatePublicScreens();
    return screen || undefined;
  }

  async deleteScreen(id: string): Promise<boolean> {
    const result = await db.delete(screens).where(eq(screens.id, id));
    publicCache.invalidatePublicScreens();
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
    const [campaign] = await db.update(campaigns).set(data as any).where(eq(campaigns.id, id)).returning();
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

  // ── Owner Payout methods ──────────────────

  async createOwnerPayout(insertPayout: InsertOwnerPayout): Promise<OwnerPayout> {
    const [payout] = await db.insert(ownerPayouts).values(insertPayout).returning();
    return payout;
  }

  async getOwnerPayout(id: string): Promise<OwnerPayout | undefined> {
    const [payout] = await db.select().from(ownerPayouts).where(eq(ownerPayouts.id, id));
    return payout || undefined;
  }

  async getOwnerPayoutsByOwner(ownerId: string): Promise<OwnerPayout[]> {
    return await db.select().from(ownerPayouts)
      .where(eq(ownerPayouts.ownerId, ownerId))
      .orderBy(desc(ownerPayouts.createdAt));
  }

  async getOwnerPayoutsByBooking(bookingId: string): Promise<OwnerPayout[]> {
    return await db.select().from(ownerPayouts)
      .where(eq(ownerPayouts.bookingId, bookingId))
      .orderBy(asc(ownerPayouts.payoutNumber));
  }

  async getOwnerPayoutsByCampaign(campaignId: string): Promise<OwnerPayout[]> {
    return await db.select().from(ownerPayouts)
      .where(eq(ownerPayouts.campaignId, campaignId))
      .orderBy(desc(ownerPayouts.createdAt));
  }

  async getAllOwnerPayouts(): Promise<OwnerPayout[]> {
    return await db.select().from(ownerPayouts).orderBy(desc(ownerPayouts.createdAt));
  }

  async updateOwnerPayout(id: string, data: Partial<OwnerPayout>): Promise<OwnerPayout | undefined> {
    const [payout] = await db.update(ownerPayouts).set(data).where(eq(ownerPayouts.id, id)).returning();
    return payout || undefined;
  }

  async getExpiredPendingPayouts(): Promise<OwnerPayout[]> {
    const now = new Date();
    return await db.select().from(ownerPayouts).where(
      and(
        eq(ownerPayouts.status, "pending_owner_accept"),
        lte(ownerPayouts.expiresAt, now)
      )
    );
  }

  async getOwnerEarningsSummary(ownerId: string): Promise<{
    totalEarned: number; totalPending: number; totalProcessed: number;
    payoutsCount: number; pendingPayoutsCount: number;
  }> {
    const result = await db.execute(drizzleSql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'processed' THEN payout_amount ELSE 0 END), 0)::int AS total_processed,
        COALESCE(SUM(CASE WHEN status IN ('pending_admin', 'initiated', 'pending_owner_accept', 'accepted') THEN payout_amount ELSE 0 END), 0)::int AS total_pending,
        COALESCE(SUM(CASE WHEN status IN ('processed', 'accepted') THEN payout_amount ELSE 0 END), 0)::int AS total_earned,
        COUNT(*)::int AS payouts_count,
        COUNT(*) FILTER (WHERE status IN ('pending_admin', 'initiated', 'pending_owner_accept', 'accepted'))::int AS pending_payouts_count
      FROM owner_payouts WHERE owner_id = ${ownerId}
    `);
    const r = result.rows[0] as any;
    return {
      totalEarned: Number(r.total_earned),
      totalPending: Number(r.total_pending),
      totalProcessed: Number(r.total_processed),
      payoutsCount: Number(r.payouts_count),
      pendingPayoutsCount: Number(r.pending_payouts_count),
    };
  }

  // ── Invoice methods ──────────────────

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice || undefined;
  }

  async getInvoicesByAdvertiser(advertiserId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.advertiserId, advertiserId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByOwner(ownerId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.ownerId, ownerId))
      .orderBy(desc(invoices.createdAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const result = await db.execute(drizzleSql`SELECT nextval('invoice_number_seq')::int AS seq`);
    const seq = Number((result.rows[0] as any).seq);
    const year = new Date().getFullYear();
    return `PS-INV-${year}-${String(seq).padStart(4, '0')}`;
  }

  // ── Notification methods ──────────────────

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    // Push real-time notification via WebSocket
    if (notification.userId) {
      notifyUser(notification.userId, {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data as Record<string, any> | undefined,
      });
    }
    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: drizzleSql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.count;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification || undefined;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  // ── Proof of Play methods ──────────────────

  async createProofOfPlay(insertProof: InsertProofOfPlay): Promise<ProofOfPlay> {
    const [proof] = await db.insert(proofOfPlay).values(insertProof as any).returning();
    return proof;
  }

  async getProofOfPlay(id: string): Promise<ProofOfPlay | undefined> {
    const [proof] = await db.select().from(proofOfPlay).where(eq(proofOfPlay.id, id));
    return proof || undefined;
  }

  async getProofOfPlayByBooking(bookingId: string): Promise<ProofOfPlay[]> {
    return await db.select().from(proofOfPlay)
      .where(eq(proofOfPlay.bookingId, bookingId))
      .orderBy(desc(proofOfPlay.createdAt));
  }

  async getProofOfPlayByOwner(ownerId: string): Promise<ProofOfPlay[]> {
    return await db.select().from(proofOfPlay)
      .where(eq(proofOfPlay.ownerId, ownerId))
      .orderBy(desc(proofOfPlay.createdAt));
  }

  async getAllProofOfPlay(): Promise<ProofOfPlay[]> {
    return await db.select().from(proofOfPlay).orderBy(desc(proofOfPlay.createdAt));
  }

  async updateProofOfPlay(id: string, data: Partial<ProofOfPlay>): Promise<ProofOfPlay | undefined> {
    const [proof] = await db.update(proofOfPlay).set(data).where(eq(proofOfPlay.id, id)).returning();
    return proof || undefined;
  }

  // ── Booking extended methods ──────────────────

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set(data as any).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async getBookingsWithExpiredPaymentDeadline(): Promise<Booking[]> {
    const now = new Date();
    return await db.select().from(bookings).where(
      and(
        eq(bookings.status, "owner_approved"),
        lte(bookings.paymentDeadline, now)
      )
    );
  }

  // ── Payment extended methods ──────────────────

  async getPaymentByCampaign(campaignId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments)
      .where(eq(payments.campaignId, campaignId))
      .orderBy(desc(payments.createdAt));
    return payment || undefined;
  }

  async getPaymentByGatewayOrder(gatewayOrderId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments)
      .where(eq(payments.gatewayOrderId, gatewayOrderId));
    return payment || undefined;
  }

  async getPaymentsByAdvertiser(advertiserId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.advertiserId, advertiserId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    return payment || undefined;
  }

  // ── Screen availability / overlap checks ──────────────────

  async getScreenBrandAvailability(screenId: string, startDate: Date, endDate: Date): Promise<{
    maxBrands: number; bookedBrands: number; availableBrands: number;
  }> {
    // Get screen's max brands per loop
    const screen = await this.getScreen(screenId);
    if (!screen) {
      return { maxBrands: 0, bookedBrands: 0, availableBrands: 0 };
    }
    const maxBrands = screen.maxBrandsPerLoop || 1;

    // Count active/approved bookings that overlap with the requested date range
    const result = await db.execute(drizzleSql`
      SELECT COUNT(*)::int AS booked
      FROM bookings
      WHERE screen_id = ${screenId}
        AND status IN ('approved', 'active', 'owner_approved', 'pending_owner')
        AND start_date < ${endDate}
        AND end_date > ${startDate}
    `);
    const bookedBrands = Number((result.rows[0] as any).booked);
    return {
      maxBrands,
      bookedBrands,
      availableBrands: Math.max(0, maxBrands - bookedBrands),
    };
  }

  async checkBookingOverlap(screenId: string, startDate: Date, endDate: Date, excludeBookingId?: string): Promise<number> {
    let query = drizzleSql`
      SELECT COUNT(*)::int AS overlap_count
      FROM bookings
      WHERE screen_id = ${screenId}
        AND status IN ('approved', 'active', 'owner_approved', 'pending_owner')
        AND start_date < ${endDate}
        AND end_date > ${startDate}
    `;
    if (excludeBookingId) {
      query = drizzleSql`
        SELECT COUNT(*)::int AS overlap_count
        FROM bookings
        WHERE screen_id = ${screenId}
          AND id != ${excludeBookingId}
          AND status IN ('approved', 'active', 'owner_approved', 'pending_owner')
          AND start_date < ${endDate}
          AND end_date > ${startDate}
      `;
    }
    const result = await db.execute(query);
    return Number((result.rows[0] as any).overlap_count);
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
    return (result.rows as any[]).map(r => mapRowToCamel(r));
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
    return (result.rows as any[]).map(r => mapRowToCamel(r));
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

  async getCampaignsWithBookingStats(advertiserId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const countResult = await db.execute(drizzleSql`
      SELECT COUNT(*) as total FROM campaigns WHERE advertiser_id = ${advertiserId}
    `);
    const total = Number(countResult.rows[0].total);

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
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    const data = (result.rows as any[]).map(r => {
      const mapped = mapRowToCamel<any>(r);
      return {
        ...mapped,
        bookingStats: {
          total: Number(r.booking_total),
          approved: Number(r.booking_approved),
          rejected: Number(r.booking_rejected),
          pending: Number(r.booking_pending),
        },
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
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
    return (result.rows as any[]).map(r => mapRowToCamel(r));
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
    boundsN?: number; boundsS?: number; boundsE?: number; boundsW?: number;
    locations?: Array<{ type: 'city' | 'map', lat?: number, lng?: number, radiusKm?: number, city?: string }>;
    venueCategories?: string[]; environmentTypes?: string[];
    environmentTags?: string[]; userIntents?: string[]; locationTags?: string[]; minBookingDays?: number;
    types?: string[]; occupationMixes?: string[]; userMoods?: string[]; genderOrientations?: string[]; incomeLevels?: string[];
    limit?: number; offset?: number;
    search?: string;
    page?: number; pageSize?: number;
    sortBy?: 'distance' | 'price' | 'popularity' | 'newest';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Screen[] | { screens: Screen[]; total: number }> {
    const conditions: ReturnType<typeof drizzleSql>[] = [drizzleSql`status IN ('active', 'approved')`];

    if (filters.city) {
      const normalizedCity = normalizeCityName(filters.city);
      conditions.push(drizzleSql`LOWER(city) LIKE LOWER(${`%${normalizedCity}%`})`);
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
    if (filters.search) {
      conditions.push(drizzleSql`(
        LOWER(name) LIKE LOWER(${`%${filters.search}%`})
        OR LOWER(location) LIKE LOWER(${`%${filters.search}%`})
        OR LOWER(city) LIKE LOWER(${`%${filters.search}%`})
        OR LOWER(venue_name) LIKE LOWER(${`%${filters.search}%`})
      )`);
    }

    if (filters.venueCategories && filters.venueCategories.length > 0) {
      const venueArrStr = `{${filters.venueCategories.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`venue_category = ANY(${venueArrStr}::text[])`);
    }
    
    if (filters.environmentTypes && filters.environmentTypes.length > 0) {
      const envArrStr = `{${filters.environmentTypes.map(e => `"${e.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`environment_type = ANY(${envArrStr}::text[])`);
    }

    if (filters.environmentTags && filters.environmentTags.length > 0) {
      // Postgres array overlap operator && to see if ANY of the requested tags exist in either location_tags or lifestyle_tags
      const tagArrStr = `{${filters.environmentTags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`(location_tags && ${tagArrStr}::text[] OR lifestyle_tags && ${tagArrStr}::text[])`);
    }

    if (filters.userIntents && filters.userIntents.length > 0) {
      const intentArrStr = `{${filters.userIntents.map(i => `"${i.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`user_intent && ${intentArrStr}::text[]`);
    }
    
    if (filters.types && filters.types.length > 0) {
      const arrStr = `{${filters.types.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`type = ANY(${arrStr}::text[])`);
    }

    if (filters.occupationMixes && filters.occupationMixes.length > 0) {
      const arrStr = `{${filters.occupationMixes.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`occupation_mix && ${arrStr}::text[]`);
    }

    if (filters.userMoods && filters.userMoods.length > 0) {
      const arrStr = `{${filters.userMoods.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`user_mood && ${arrStr}::text[]`);
    }

    if (filters.genderOrientations && filters.genderOrientations.length > 0) {
      const arrStr = `{${filters.genderOrientations.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`gender_orientation = ANY(${arrStr}::text[])`);
    }

    if (filters.incomeLevels && filters.incomeLevels.length > 0) {
      const arrStr = `{${filters.incomeLevels.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`income_level = ANY(${arrStr}::text[])`);
    }

    if (filters.locationTags && filters.locationTags.length > 0) {
      const locTagArrStr = `{${filters.locationTags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
      conditions.push(drizzleSql`location_tags && ${locTagArrStr}::text[]`);
    }

    if (filters.minBookingDays !== undefined) {
      conditions.push(drizzleSql`min_booking_days <= ${filters.minBookingDays}`);
    }

    if (filters.locations && filters.locations.length > 0) {
      const locationConditions: ReturnType<typeof drizzleSql>[] = [];
      for (const loc of filters.locations) {
        if (loc.type === 'city' && loc.city) {
          const normalizedCity = normalizeCityName(loc.city);
          locationConditions.push(drizzleSql`LOWER(city) LIKE LOWER(${`%${normalizedCity}%`})`);
        } else if (loc.type === 'map' && loc.lat !== undefined && loc.lng !== undefined && loc.radiusKm !== undefined) {
          locationConditions.push(drizzleSql`(
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${loc.lat})) * cos(radians(latitude::float)) *
                cos(radians(longitude::float) - radians(${loc.lng})) +
                sin(radians(${loc.lat})) * sin(radians(latitude::float))
              ))
            )
          ) <= ${loc.radiusKm}`);
        }
      }
      if (locationConditions.length > 0) {
        conditions.push(drizzleSql`(${drizzleSql.join(locationConditions, drizzleSql` OR `)})`);
      }
    } else if (filters.boundsN !== undefined && filters.boundsS !== undefined && filters.boundsE !== undefined && filters.boundsW !== undefined) {
      conditions.push(drizzleSql`latitude::float <= ${filters.boundsN} AND latitude::float >= ${filters.boundsS}`);
      conditions.push(drizzleSql`longitude::float <= ${filters.boundsE} AND longitude::float >= ${filters.boundsW}`);
    } else if (filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined) {
      // Legacy single map logic (Bounding box pre-filter for index usage)
      const latRad = filters.radiusKm / 111.0;
      const lngRad = filters.radiusKm / (111.0 * Math.cos(filters.lat * Math.PI / 180));
      conditions.push(drizzleSql`latitude::float BETWEEN ${filters.lat - latRad} AND ${filters.lat + latRad}`);
      conditions.push(drizzleSql`longitude::float BETWEEN ${filters.lng - lngRad} AND ${filters.lng + lngRad}`);
      // Precise Haversine distance
      conditions.push(drizzleSql`(
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${filters.lat})) * cos(radians(latitude::float)) *
            cos(radians(longitude::float) - radians(${filters.lng})) +
            sin(radians(${filters.lat})) * sin(radians(latitude::float))
          ))
        )
      ) <= ${filters.radiusKm}`);
    }

    const whereClause = drizzleSql.join(conditions, drizzleSql` AND `);

    let haversineSelect = drizzleSql``;
    let orderClause = drizzleSql`ORDER BY avg_daily_footfall DESC`;

    if (filters.lat !== undefined && filters.lng !== undefined) {
      haversineSelect = drizzleSql`, (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${filters.lat})) * cos(radians(latitude::float)) *
            cos(radians(longitude::float) - radians(${filters.lng})) +
            sin(radians(${filters.lat})) * sin(radians(latitude::float))
          ))
        )
      ) AS distance_km`;
    }

    if (filters.sortBy === 'price') {
      orderClause = filters.sortOrder === 'asc' ? drizzleSql`ORDER BY price_per_day ASC` : drizzleSql`ORDER BY price_per_day DESC`;
    } else if (filters.sortBy === 'newest') {
      orderClause = filters.sortOrder === 'asc' ? drizzleSql`ORDER BY created_at ASC` : drizzleSql`ORDER BY created_at DESC`;
    } else if (filters.sortBy === 'distance' && filters.lat !== undefined && filters.lng !== undefined) {
      orderClause = filters.sortOrder === 'desc' ? drizzleSql`ORDER BY distance_km DESC` : drizzleSql`ORDER BY distance_km ASC`;
    } else if (filters.sortBy === 'popularity') {
      orderClause = filters.sortOrder === 'asc' ? drizzleSql`ORDER BY avg_daily_footfall ASC` : drizzleSql`ORDER BY avg_daily_footfall DESC`;
    }

    // If page/pageSize provided, return paginated result with total count
    if (filters.page && filters.pageSize) {
      const countResult = await db.execute(
        drizzleSql`SELECT COUNT(*)::int AS total FROM screens WHERE ${whereClause}`
      );
      const total = (countResult.rows[0] as any)?.total ?? 0;

      const offset = (filters.page - 1) * filters.pageSize;
      const dataResult = await db.execute(
        drizzleSql`SELECT * ${haversineSelect} FROM screens WHERE ${whereClause} ${orderClause} LIMIT ${filters.pageSize} OFFSET ${offset}`
      );
      
      const screens = (dataResult.rows as any[]).map(r => {
        const screen = mapRowToCamel<Screen & { distanceKm?: number }>(r);
        if (r.distance_km !== undefined) screen.distanceKm = parseFloat(r.distance_km) || 0;
        return screen as Screen;
      });
      return { screens, total };
    }

    // Legacy: return array (backward compatibility)
    let query = drizzleSql`SELECT * ${haversineSelect} FROM screens WHERE ${whereClause} ${orderClause}`;
    if (filters.limit) {
      query = drizzleSql`${query} LIMIT ${filters.limit}`;
    }
    if (filters.offset) {
      query = drizzleSql`${query} OFFSET ${filters.offset}`;
    }

    const result = await db.execute(query);
    return (result.rows as any[]).map(r => {
      const screen = mapRowToCamel<Screen & { distanceKm?: number }>(r);
      if (r.distance_km !== undefined) screen.distanceKm = parseFloat(r.distance_km) || 0;
      return screen as Screen;
    });
  }

  async getScreenLocations() {
    const result = await db.execute(drizzleSql`
      SELECT DISTINCT state, city FROM screens WHERE status = 'active' ORDER BY state, city
    `);
    const states = new Set<string>();
    const citiesByState: Record<string, Set<string>> = {};
    const allCities = new Set<string>();

    (result.rows as any[]).forEach(r => {
      const normalizedCity = normalizeCityName(r.city);
      if (r.state) {
        states.add(r.state);
        if (!citiesByState[r.state]) citiesByState[r.state] = new Set();
        citiesByState[r.state].add(normalizedCity);
      }
      allCities.add(normalizedCity);
    });

    // Convert Sets to sorted arrays
    const citiesByStateArrays: Record<string, string[]> = {};
    for (const [state, citySet] of Object.entries(citiesByState)) {
      citiesByStateArrays[state] = Array.from(citySet).sort();
    }

    return {
      states: Array.from(states).sort(),
      citiesByState: citiesByStateArrays,
      allCities: Array.from(allCities).sort(),
    };
  }

  async getScreensPaginated(params: {
    ownerId?: string;
    status?: string;
    city?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<{ screens: Screen[]; total: number }> {
    const conditions: ReturnType<typeof drizzleSql>[] = [];

    if (params.ownerId) {
      conditions.push(drizzleSql`owner_id = ${params.ownerId}`);
    }
    if (params.status) {
      conditions.push(drizzleSql`status = ${params.status}`);
    }
    if (params.city) {
      const normalizedCity = normalizeCityName(params.city);
      conditions.push(drizzleSql`LOWER(city) LIKE LOWER(${`%${normalizedCity}%`})`);
    }
    if (params.search) {
      conditions.push(drizzleSql`(
        LOWER(name) LIKE LOWER(${`%${params.search}%`})
        OR LOWER(location) LIKE LOWER(${`%${params.search}%`})
        OR LOWER(city) LIKE LOWER(${`%${params.search}%`})
        OR LOWER(venue_name) LIKE LOWER(${`%${params.search}%`})
      )`);
    }

    const whereClause = conditions.length > 0
      ? drizzleSql`WHERE ${drizzleSql.join(conditions, drizzleSql` AND `)}`
      : drizzleSql``;

    // Get total count
    const countResult = await db.execute(
      drizzleSql`SELECT COUNT(*)::int AS total FROM screens ${whereClause}`
    );
    const total = (countResult.rows[0] as any)?.total ?? 0;

    // Get paginated results
    const offset = (params.page - 1) * params.pageSize;
    const dataResult = await db.execute(
      drizzleSql`SELECT * FROM screens ${whereClause} ORDER BY created_at DESC LIMIT ${params.pageSize} OFFSET ${offset}`
    );

    return { screens: (dataResult.rows as any[]).map(r => mapRowToCamel<Screen>(r)), total };
  }

  /**
   * Get nearby active screens sorted by distance from a given lat/lng.
   * Uses Haversine formula for precise distance calculation.
   * Returns screens with a `distanceKm` field.
   */
  async getNearbyScreens(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
  }): Promise<{ screens: (Screen & { distanceKm: number })[]; total: number }> {
    const { lat, lng, radiusKm, limit } = params;

    // Bounding box pre-filter for index usage
    const latRad = radiusKm / 111.0;
    const lngRad = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));

    const haversine = drizzleSql`(
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${lat})) * cos(radians(latitude::float)) *
          cos(radians(longitude::float) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude::float))
        ))
      )
    )`;

    // Count total within radius
    const countResult = await db.execute(
      drizzleSql`SELECT COUNT(*)::int AS total FROM screens
        WHERE status = 'active'
          AND latitude::float BETWEEN ${lat - latRad} AND ${lat + latRad}
          AND longitude::float BETWEEN ${lng - lngRad} AND ${lng + lngRad}
          AND ${haversine} <= ${radiusKm}`
    );
    const total = (countResult.rows[0] as any)?.total ?? 0;

    // Fetch screens ordered by distance, limited
    const dataResult = await db.execute(
      drizzleSql`SELECT *, ${haversine} AS distance_km FROM screens
        WHERE status = 'active'
          AND latitude::float BETWEEN ${lat - latRad} AND ${lat + latRad}
          AND longitude::float BETWEEN ${lng - lngRad} AND ${lng + lngRad}
          AND ${haversine} <= ${radiusKm}
        ORDER BY distance_km ASC
        LIMIT ${limit}`
    );

    const screens = (dataResult.rows as any[]).map(r => {
      const screen = mapRowToCamel<Screen & { distanceKm: number }>(r);
      screen.distanceKm = parseFloat(r.distance_km) || 0;
      return screen;
    });

    return { screens, total };
  }

  async getScreenFilters(): Promise<{ cities: string[]; venueTypes: string[]; environmentTypes: string[]; tags: { id: string; name: string; displayName: string; category: string }[]; userIntents: string[]; locationTags: string[]; types: string[]; occupationMixes: string[]; userMoods: string[]; genderOrientations: string[]; incomeLevels: string[] }> {
    // Queries to extract distinct active filter values directly from the database
    
    // 1. Unique Cities
    const cityResult = await db.execute(drizzleSql`
      SELECT DISTINCT city FROM screens WHERE status = 'active' AND city IS NOT NULL ORDER BY city
    `);
    const cities = (cityResult.rows as any[]).map(r => r.city).filter(Boolean);

    // 2. Unique Venue Types
    const venueResult = await db.execute(drizzleSql`
      SELECT DISTINCT venue_category as venue_type FROM screens WHERE status = 'active' AND venue_category IS NOT NULL ORDER BY venue_category
    `);
    const venueTypes = (venueResult.rows as any[]).map(r => r.venue_type).filter(Boolean);

    // 3. Unique Environment Types (Indoor/Outdoor)
    const envResult = await db.execute(drizzleSql`
      SELECT DISTINCT environment_type FROM screens WHERE status = 'active' AND environment_type IS NOT NULL ORDER BY environment_type
    `);
    const environmentTypes = (envResult.rows as any[]).map(r => r.environment_type).filter(Boolean);

    // 4. Tags: fetch from screen_tags table to get categories and display names
    // We only return tags that are either in location_tags or lifestyle_tags of any active screen
    const tagsResult = await db.execute(drizzleSql`
      SELECT t.slug, t.display_name, t.category
      FROM screen_tags t
      WHERE t.is_active = true
      AND (
        EXISTS (SELECT 1 FROM screens s WHERE s.status = 'active' AND t.slug = ANY(s.location_tags))
        OR EXISTS (SELECT 1 FROM screens s WHERE s.status = 'active' AND t.slug = ANY(s.lifestyle_tags))
      )
      ORDER BY t.category, t.display_name
    `);
    
    const tags = (tagsResult.rows as any[])
      .map((r, i) => ({ 
        id: r.slug, 
        name: r.slug, 
        displayName: r.display_name, 
        category: r.category 
      }));

    // 5. Unique User Intents
    const userIntentResult = await db.execute(drizzleSql`
      SELECT DISTINCT unnest(user_intent) as intent FROM screens WHERE status = 'active' AND user_intent IS NOT NULL
    `);
    const userIntents = (userIntentResult.rows as any[]).map(r => r.intent).filter(Boolean);

    // 6. Unique Location Tags
    const locationTagsResult = await db.execute(drizzleSql`
      SELECT DISTINCT unnest(location_tags) as tag FROM screens WHERE status = 'active' AND location_tags IS NOT NULL
    `);
    const locationTags = (locationTagsResult.rows as any[]).map(r => r.tag).filter(Boolean);

    // 7. Unique Screen Types
    const typeResult = await db.execute(drizzleSql`
      SELECT DISTINCT type FROM screens WHERE status = 'active' AND type IS NOT NULL
    `);
    const types = (typeResult.rows as any[]).map(r => r.type).filter(Boolean);

    // 8. Unique Occupation Mixes
    const occMixResult = await db.execute(drizzleSql`
      SELECT DISTINCT unnest(occupation_mix) as occ FROM screens WHERE status = 'active' AND occupation_mix IS NOT NULL
    `);
    const occupationMixes = (occMixResult.rows as any[]).map(r => r.occ).filter(Boolean);

    // 9. Unique User Moods
    const userMoodResult = await db.execute(drizzleSql`
      SELECT DISTINCT unnest(user_mood) as mood FROM screens WHERE status = 'active' AND user_mood IS NOT NULL
    `);
    const userMoods = (userMoodResult.rows as any[]).map(r => r.mood).filter(Boolean);

    // 10. Unique Gender Orientations
    const genderResult = await db.execute(drizzleSql`
      SELECT DISTINCT gender_orientation FROM screens WHERE status = 'active' AND gender_orientation IS NOT NULL
    `);
    const genderOrientations = (genderResult.rows as any[]).map(r => r.gender_orientation).filter(Boolean);

    // 11. Unique Income Levels
    const incomeResult = await db.execute(drizzleSql`
      SELECT DISTINCT income_level FROM screens WHERE status = 'active' AND income_level IS NOT NULL
    `);
    const incomeLevels = (incomeResult.rows as any[]).map(r => r.income_level).filter(Boolean);

    return { cities, venueTypes, environmentTypes, tags, userIntents, locationTags, types, occupationMixes, userMoods, genderOrientations, incomeLevels };
  }

  // ========== SUPPORT TICKETS ==========

  async createSupportTicket(userId: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket> {
    const [ticket] = await db.insert(supportTickets).values({
      userId,
      subject: data.subject || "No Subject",
      category: data.category || null,
      priority: data.priority || "medium",
    }).returning();
    return ticket;
  }

  async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.updatedAt));
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .orderBy(desc(supportTickets.updatedAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const [ticket] = await db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async addTicketMessage(ticketId: string, senderId: string, message: string, attachments: any[] = []): Promise<TicketMessage> {
    // Insert message
    const [msg] = await db.insert(ticketMessages).values({
      ticketId,
      senderId,
      message,
      attachments,
    }).returning();

    // Update ticket updatedAt
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId));

    return msg;
  }

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return await db.select().from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt));
  }

  // ── Zone Screen methods ─────────────────────────────────────────────────────

  async getZoneForScreen(screenId: string): Promise<ZoneInfo | null> {
    const rows = await db
      .select({
        zoneName: zones.name,
        pricePerDay: zones.pricePerDay,
        minBookingDays: zones.minBookingDays,
        status: zones.status,
        zoneId: zones.id
      })
      .from(screens)
      .innerJoin(zones, eq(screens.zoneId, zones.id))
      .where(
        and(
          eq(screens.id, screenId),
          eq(zones.status, "active")
        )
      )
      .limit(1);

    if (!rows.length) return null;

    const { zoneName, pricePerDay, minBookingDays, status, zoneId } = rows[0];

    // Fetch all screen IDs in this zone
    const allRows = await db
      .select({ screenId: screens.id })
      .from(screens)
      .where(eq(screens.zoneId, zoneId));

    return {
      zoneName,
      pricePerDay,
      minBookingDays,
      status,
      screenIds: allRows.map((r) => r.screenId),
    };
  }

  async getScreensInZone(zoneName: string): Promise<{ zone: ZoneInfo; screens: Screen[] }> {
    const zoneRows = await db
      .select({
        zoneId: zones.id,
        pricePerDay: zones.pricePerDay,
        minBookingDays: zones.minBookingDays,
        status: zones.status
      })
      .from(zones)
      .where(
        and(
          eq(zones.name, zoneName),
          eq(zones.status, "active")
        )
      )
      .limit(1);

    if (!zoneRows.length) {
      return { zone: { zoneName, pricePerDay: 0, minBookingDays: 1, status: "inactive", screenIds: [] }, screens: [] };
    }

    const { zoneId, pricePerDay, minBookingDays, status } = zoneRows[0];
    
    // Fetch the actual screen records
    const screenRecords = await db
      .select()
      .from(screens)
      .where(eq(screens.zoneId, zoneId));
      
    const screenIds = screenRecords.map(r => r.id);

    return {
      zone: { zoneName, pricePerDay, minBookingDays, status, screenIds },
      screens: screenRecords,
    };
  }
}

export const storage = new DatabaseStorage();
