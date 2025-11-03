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
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  
  // Contact Information
  phone: text("phone"),
  mobileNumber: text("mobile_number").unique(),
  mobileVerified: boolean("mobile_verified").notNull().default(false),
  
  // Company/Business Information
  companyName: text("company_name"),
  industry: text("industry"),
  gstNumber: text("gst_number"),
  
  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  
  // Profile Status
  profileCompleted: boolean("profile_completed").notNull().default(false),
  
  role: text("role").notNull().default("advertiser"), // admin, screen_owner, advertiser
  status: text("status").notNull().default("active"), // active, inactive, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screens table - digital advertising screens
export const screens = pgTable("screens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id"), // nullable for admin-owned screens
  
  // SECTION 1 — Screen Identity
  name: text("name").notNull(),
  category: text("category").notNull(), // Digital Display / LED Video Wall / Kiosk / Mall LED / Lift Display / Transit Display
  displayFormat: text("display_format").notNull(), // Portrait / Landscape / Square
  resolution: text("resolution").notNull(), // e.g., "1920x1080"
  durationPerSlot: integer("duration_per_slot").notNull(), // seconds
  
  // SECTION 2 — Location & Context
  venueName: text("venue_name").notNull(),
  location: text("location").notNull(), // address
  city: text("city").notNull(),
  state: text("state"), // Indian state or union territory (nullable for backward compatibility)
  pincode: text("pincode").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  venueCategory: text("venue_category").notNull(), // Airport / Apartment / Bus Stop / Café / Cinema / Co-working / College / Corporate Park / Flyover / Gym / Highway / Hospital / Mall / Metro / Office Building / Restaurant / Retail Store / Road Junction / Road Side / Salon / Shopping Complex / Stadium
  avgDailyFootfall: integer("avg_daily_footfall").notNull(),
  trafficType: text("traffic_type").notNull(), // Pedestrian / Seated Audience / Transit / Mixed
  timeOfDayActivity: text("time_of_day_activity").array(), // Morning Rush / Lunch Hours / Evening Leisure / Late Night
  environmentType: text("environment_type").notNull(), // Indoor / Semi-Outdoor / Outdoor Digital
  
  // Enhanced Location Context
  visibility: text("visibility"), // High / Medium / Low - based on footfall and visibility
  description: text("description"), // Describe screen, surroundings, pricing justification
  operatingHoursPreset: text("operating_hours_preset"), // Business hours / Mall hours / Retail / Airport/Highways / Custom
  customOperatingHours: text("custom_operating_hours"), // e.g., "09:00-18:00" for custom preset
  customOperatingDays: text("custom_operating_days"), // e.g., "Mon-Fri" for custom preset
  locationTags: text("location_tags").array(), // Nearby facilities: School, Hospital, Mall, etc.
  customLocationTags: text("custom_location_tags").array(), // User-added custom location tags
  
  // SECTION 3 — Audience Demographics
  detailedAgeGroups: text("detailed_age_groups").array(), // Children (5-12) / Teenagers (13-17) / Young Adults (18-25) / Adults (26-40) / Middle Age (41-55) / Seniors (55+) / All Ages
  genderOrientation: text("gender_orientation"), // Male Dominant / Female Dominant / Mixed Gender / Family Oriented
  incomeLevel: text("income_level"), // Budget Conscious / Middle Income / Premium Audience / Luxury Buyers
  occupationMix: text("occupation_mix").array(), // Students / Working Professionals / Business Owners / Homemakers
  lifestyleTags: text("lifestyle_tags").array(), // Working Professionals / Students / Commuters / Shoppers / Tourists / Local Residents / Health Conscious / Tech Savvy
  avgDwellTime: integer("avg_dwell_time").notNull(), // minutes
  interestSegments: text("interest_segments").array(), // Fitness, Coffee, Tech, Luxury Cars, Fashion, Foodies
  customAudienceTags: text("custom_audience_tags").array(), // User-added custom audience tags for increased targeting accuracy
  
  // User Intent & Mood (for campaign targeting)
  userIntent: text("user_intent").array(), // Shopping, Commuting, Dining, Fitness, Entertainment, Work, Education
  userMood: text("user_mood").array(), // Relaxed, Rushed, Social, Focused, Leisure
  
  // Commercial & Campaign Data
  isMultiScreen: boolean("is_multi_screen").notNull().default(false),
  numberOfScreens: integer("number_of_screens"), // Required if isMultiScreen is true
  pricePerDay: integer("price_per_day").notNull(),
  minBookingDays: integer("min_booking_days").notNull().default(1),
  playbackSlotsPerHour: integer("playback_slots_per_hour").notNull(),
  contentTypesSupported: text("content_types_supported").array(), // Static Image / Video / Interactive / HTML5
  
  // Legacy/Support fields
  type: text("type").notNull(), // backward compatibility - will map to category
  size: text("size").notNull(), // dimensions like "10x20 ft" - can be derived from resolution
  operationalHours: text("operational_hours"), // JSON string: {"start": "06:00", "end": "22:00"}
  images: text("images").array(), // array of image URLs from object storage
  status: text("status").notNull().default("pending"), // pending, active, inactive
  rejectionReason: text("rejection_reason"), // Admin's reason for rejecting the screen
  ownedByAdmin: boolean("owned_by_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaigns table - advertiser campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(), // brand_awareness, product_launch, event_promotion, etc.
  
  // New: Area-based targeting (map + radius OR city)
  targetArea: jsonb("target_area").$type<{
    type: 'map' | 'city';
    // For map type:
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    // For city type:
    city?: string;
    state?: string;
  }>(),
  
  // Legacy targeting criteria (kept for backward compatibility and optional filters)
  targetLocationType: text("target_location_type"), // city, state, india, pincodes
  targetCities: text("target_cities").array(), // Array of city names
  targetState: text("target_state"), // State name for state-level targeting
  targetPincodes: text("target_pincodes").array(), // Array of pincodes
  
  // Demographics & Persona
  targetAgeGroups: text("target_age_groups").array(), // 18-25, 25-40, 40-60, 60+
  targetGender: text("target_gender"), // male, female, all
  targetAffluence: text("target_affluence").array(), // Premium, Mid, Budget
  targetOccupations: text("target_occupations").array(), // Students, Working Professionals, etc.
  
  // Intent & Mood
  targetIntent: text("target_intent").array(), // Shopping, Commuting, Dining, Fitness, Entertainment
  targetMood: text("target_mood").array(), // Relaxed, Rushed, Social, Focused
  
  // Venue type filters (optional)
  venueTypeFilters: text("venue_type_filters").array(), // Airport, Apartment, Bus Stop, Café, Cinema, Co-working, College, Corporate Park, Flyover, Gym, Highway, Hospital, Mall, Metro, Office Building, Restaurant, Retail Store, Road Junction, Road Side, Salon, Shopping Complex, Stadium
  
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: integer("budget").notNull(),
  estimatedBudget: integer("estimated_budget"), // AI-calculated budget based on recommended screens
  creativeUrl: text("creative_url"), // URL to uploaded creative from object storage
  status: text("status").notNull().default("pending"), // pending, approved, live, completed, rejected
  rejectionReason: text("rejection_reason"), // Admin's reason for rejecting the campaign
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings table - links screens to campaigns
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  screenId: varchar("screen_id").notNull(),
  campaignId: varchar("campaign_id").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("pending_owner"), // pending_owner, owner_approved, owner_rejected, pending_admin, admin_approved, admin_rejected, active, completed
  approvedByAdmin: boolean("approved_by_admin").notNull().default(false),
  ownerApproved: boolean("owner_approved").notNull().default(false),
  ownerResponse: text("owner_response"), // Owner's message/feedback
  ownerRespondedAt: timestamp("owner_responded_at"),
  alternativeDates: jsonb("alternative_dates").$type<{startDate: string; endDate: string}>(), // If owner suggests alternate dates
  adminNotes: text("admin_notes"), // Admin's notes for approval/rejection
  adminRespondedAt: timestamp("admin_responded_at"),
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
