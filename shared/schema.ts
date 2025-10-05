import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("advertiser"), // admin, screen_owner, advertiser
  status: text("status").notNull().default("active"), // active, inactive, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screens table - digital advertising screens
export const screens = pgTable("screens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id"), // nullable for admin-owned screens
  name: text("name").notNull(),
  type: text("type").notNull(), // billboard, digital_display, led_screen, etc.
  size: text("size").notNull(), // dimensions like "10x20 ft"
  location: text("location").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  pricePerDay: integer("price_per_day").notNull(),
  minBookingDays: integer("min_booking_days").notNull().default(1),
  operationalHours: text("operational_hours"), // JSON string: {"start": "06:00", "end": "22:00"}
  images: text("images").array(), // array of image URLs from object storage
  status: text("status").notNull().default("pending"), // pending, active, inactive
  ownedByAdmin: boolean("owned_by_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaigns table - advertiser campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(), // brand_awareness, product_launch, event_promotion, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: integer("budget").notNull(),
  creativeUrl: text("creative_url"), // URL to uploaded creative from object storage
  status: text("status").notNull().default("pending"), // pending, approved, live, completed, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings table - links screens to campaigns
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  screenId: varchar("screen_id").notNull(),
  campaignId: varchar("campaign_id").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, live, completed
  approvedByAdmin: boolean("approved_by_admin").notNull().default(false),
  ownerApproved: boolean("owner_approved").notNull().default(false),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments table - transaction records
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  method: text("method").notNull().default("stripe"), // stripe, razorpay, etc.
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedScreens: many(screens),
  campaigns: many(campaigns),
}));

export const screensRelations = relations(screens, ({ one, many }) => ({
  owner: one(users, {
    fields: [screens.ownerId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  advertiser: one(users, {
    fields: [campaigns.advertiserId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  screen: one(screens, {
    fields: [bookings.screenId],
    references: [screens.id],
  }),
  campaign: one(campaigns, {
    fields: [bookings.campaignId],
    references: [campaigns.id],
  }),
  payment: one(payments, {
    fields: [bookings.id],
    references: [payments.bookingId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertScreenSchema = createInsertSchema(screens).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  status: true,
  approvedByAdmin: true,
  ownerApproved: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Screen = typeof screens.$inferSelect;
export type InsertScreen = z.infer<typeof insertScreenSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
