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
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Screen methods
  getScreen(id: string): Promise<Screen | undefined>;
  getScreensByOwner(ownerId: string): Promise<Screen[]>;
  getAllScreens(): Promise<Screen[]>;
  getActiveScreens(): Promise<Screen[]>;
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
  approveBookingByAdmin(id: string): Promise<Booking | undefined>;
  
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
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

  async getPendingBookingsForOwner(ownerId: string): Promise<Booking[]> {
    const ownerScreens = await this.getScreensByOwner(ownerId);
    const screenIds = ownerScreens.map(s => s.id);
    
    if (screenIds.length === 0) return [];
    
    return await db.select().from(bookings).where(
      and(
        eq(bookings.status, "pending"),
        or(...screenIds.map(id => eq(bookings.screenId, id)))
      )
    );
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
    const [booking] = await db.update(bookings).set({ ownerApproved: true }).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async approveBookingByAdmin(id: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ approvedByAdmin: true, status: "approved" }).where(eq(bookings.id, id)).returning();
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
