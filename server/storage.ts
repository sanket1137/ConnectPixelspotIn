// Reference: blueprint:javascript_database
import { 
  users, screens, campaigns, bookings, payments,
  type User, type InsertUser, 
  type Screen, type InsertScreen,
  type Campaign, type InsertCampaign,
  type Booking, type InsertBooking,
  type Payment, type InsertPayment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, desc } from "drizzle-orm";

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
  updateScreenStatus(id: string, status: string): Promise<Screen | undefined>;
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
    return await db.select().from(screens).where(eq(screens.status, "approved"));
  }

  async getPublicScreens(): Promise<Screen[]> {
    // Return only approved screens for public viewing
    return await db.select().from(screens).where(eq(screens.status, "approved")).orderBy(desc(screens.createdAt));
  }

  async getDistinctCities(): Promise<string[]> {
    // Get distinct cities from approved screens
    const result = await db
      .selectDistinct({ city: screens.city })
      .from(screens)
      .where(eq(screens.status, "approved"));
    
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

  async updateScreenStatus(id: string, status: string): Promise<Screen | undefined> {
    const [screen] = await db.update(screens).set({ status }).where(eq(screens.id, id)).returning();
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
    
    const bookingsList = await db.select().from(bookings).where(
      and(
        eq(bookings.status, "pending_owner"),
        or(...screenIds.map(id => eq(bookings.screenId, id)))
      )
    );

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
}

export const storage = new DatabaseStorage();
