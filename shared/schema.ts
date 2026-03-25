import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { normalizeCityName, normalizeVenueCategory } from "./constants";

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
  
  // Account Type (for advertisers only)
  accountType: text("account_type"), // "brand" or "agency" - only for advertisers
  brandName: text("brand_name"), // filled when accountType is "brand"
  agencyName: text("agency_name"), // filled when accountType is "agency"
  
  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  
  // Profile Status
  profileCompleted: boolean("profile_completed").notNull().default(false),
  hasSeenOnboarding: boolean("has_seen_onboarding").notNull().default(false),
  
  // Bank Details (for screen owners - payouts)
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfscCode: text("bank_ifsc_code"),
  bankName: text("bank_name"),
  upiId: text("upi_id"),
  
  // Payment deadline configuration (for screen owners)
  paymentDeadlineHours: integer("payment_deadline_hours").default(24), // how many hours advertiser gets to pay after owner approves

  role: text("role").notNull().default("advertiser"), // admin, screen_owner, advertiser
  status: text("status").notNull().default("active"), // active, inactive, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // Login tracking (updated on every signin)
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
}, (table) => [
  index("idx_users_role").on(table.role),
  index("idx_users_status").on(table.status),
  index("idx_users_created_at").on(table.createdAt),
]);

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
  latitude: decimal("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: decimal("longitude", { precision: 9, scale: 6 }).notNull(),
  venueCategory: text("venue_category").notNull(), // Airport / Apartment / Bus Stop / Café / Cinema / Co-working / College / Corporate Park / Flyover / Gym / Highway / Hospital / Mall / Metro / Office Building / Restaurant / Retail Store / Road Junction / Road Side / Salon / Shopping Complex / Stadium
  avgDailyFootfall: integer("avg_daily_footfall").notNull(),
  trafficType: text("traffic_type").notNull(), // Pedestrian / Seated Audience / Transit / Mixed
  timeOfDayActivity: text("time_of_day_activity").array(), // Morning Rush / Lunch Hours / Evening Leisure / Late Night
  environmentType: text("environment_type").notNull(), // Indoor / Semi-Outdoor / Outdoor Digital
  
  // Enhanced Location Context
  visibility: text("visibility"), // High / Medium / Low - based on footfall and visibility
  description: text("description"), // Describe screen, surroundings, pricing justification
  operatingHoursPreset: text("operating_hours_preset"), // Business hours / Mall hours / Retail / Airport/Highways / Custom
  customOperatingHoursStart: text("custom_operating_hours_start"), // e.g., "09:00" - start time for custom preset
  customOperatingHoursEnd: text("custom_operating_hours_end"), // e.g., "18:00" - end time for custom preset
  customOperatingDays: text("custom_operating_days").array(), // e.g., ["Monday", "Tuesday", "Friday"] - days for custom preset
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
  loopDuration: integer("loop_duration"), // Total loop cycle in seconds (e.g., 120s). brandsPerLoop = loopDuration / durationPerSlot
  maxBrandsPerLoop: integer("max_brands_per_loop"), // Auto-calculated: loopDuration / durationPerSlot
  playbackSlotsPerHour: integer("playback_slots_per_hour"), // Auto-calculated: 3600 / durationPerSlot (nullable for migration, auto-set on create/update)
  contentTypesSupported: text("content_types_supported").array(), // Static Image / Video / Interactive / HTML5
  
  // Legacy/Support fields
  type: text("type").notNull(), // backward compatibility - will map to category
  size: text("size").notNull(), // dimensions like "10x20 ft" - can be derived from resolution
  operationalHours: text("operational_hours"), // JSON string: {"start": "06:00", "end": "22:00"}
  images: text("images").array(), // DEPRECATED - kept for backward compatibility, use screenImages instead
  screenImages: text("screen_images").array(), // Up to 4 images of the actual screen/billboard
  surroundingImages: text("surrounding_images").array(), // Up to 5 images of the surrounding area
  status: text("status").notNull().default("pending"), // pending, active, inactive
  rejectionReason: text("rejection_reason"), // Admin's reason for rejecting the screen
  ownedByAdmin: boolean("owned_by_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // Auto-tagging metadata
  lastTaggedAt: timestamp("last_tagged_at"),
  lastTaggedLatitude: decimal("last_tagged_latitude", { precision: 9, scale: 6 }),
  lastTaggedLongitude: decimal("last_tagged_longitude", { precision: 9, scale: 6 }),
}, (table) => [
  index("idx_screens_status").on(table.status),
  index("idx_screens_owner_id").on(table.ownerId),
  index("idx_screens_city").on(table.city),
  index("idx_screens_status_city").on(table.status, table.city),
  index("idx_screens_price_per_day").on(table.pricePerDay),
  index("idx_screens_created_at").on(table.createdAt),
]);

// Screen Tags — master tag definitions (seeded once, reused across all screens)
export const screenTags = pgTable("screen_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull(), // Transportation, Retail, Food, Education, Healthcare, Entertainment, Business, Lifestyle, Audience, Time, Economic
  description: text("description"),
  googlePlaceTypes: text("google_place_types"), // JSON array string e.g. '["subway_station","transit_station"]'
  maxDistanceMeters: integer("max_distance_meters"), // proximity threshold (null = composite only)
  minPoiCount: integer("min_poi_count"), // density threshold (null = proximity only)
  baseScore: integer("base_score").notNull().default(800),
  priority: integer("priority").notNull().default(0),
  iconName: text("icon_name"), // MUI/Lucide icon name for frontend
  colorCode: text("color_code"), // hex color for chips
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screen Tag Assignments — per-screen tag join table with scoring
export const screenTagAssignments = pgTable("screen_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  screenId: varchar("screen_id").notNull(),
  tagId: varchar("tag_id").notNull(),
  source: text("source").notNull().default("auto"), // "auto" or "manual"
  score: integer("score").notNull().default(0), // 0-1200
  isPrimary: boolean("is_primary").notNull().default(false), // top 5 = true
  distanceMeters: integer("distance_meters"), // closest POI distance (proximity tags)
  poiCount: integer("poi_count"), // matching POI count (density tags)
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  index("idx_screen_tag_assignments_screen_id").on(table.screenId),
  index("idx_screen_tag_assignments_tag_id").on(table.tagId),
]);

// Campaigns table - advertiser campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(), // brand_awareness, product_launch, event_promotion, etc.
  
  // New: Area-based targeting (map + radius OR city)
  targetArea: jsonb("target_area").$type<{
    type: 'map' | 'city' | 'india' | 'none';
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
  summary: text("summary"), // Advertiser's campaign description/summary
  creativeUrl: text("creative_url"), // Legacy: URL/link to creative
  creativeFileUrl: text("creative_file_url"), // Uploaded creative file URL from object storage
  creativeFileType: text("creative_file_type"), // "image" | "video"
  creativeStatus: text("creative_status").default("pending"), // pending, approved, rejected
  creativeRejectionReason: text("creative_rejection_reason"), // Owner's reason for rejecting creative
  creativeReviewedBy: varchar("creative_reviewed_by"), // Owner user ID who reviewed
  creativeReviewedAt: timestamp("creative_reviewed_at"),
  status: text("status").notNull().default("pending"), // pending, approved, live, completed, rejected
  paymentStatus: text("payment_status").default("pending"), // pending, advertiser_paid, partially_released, fully_settled
  rejectionReason: text("rejection_reason"), // Admin's reason for rejecting the campaign
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_campaigns_advertiser_id").on(table.advertiserId),
  index("idx_campaigns_status").on(table.status),
  index("idx_campaigns_created_at").on(table.createdAt),
]);

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
  // Payment deadline: set when owner approves, advertiser must pay before this
  paymentDeadline: timestamp("payment_deadline"),
  // Admin-configured payout split amounts (in paise)
  ownerAdvanceAmount: integer("owner_advance_amount"), // advance payout on campaign start
  ownerFinalAmount: integer("owner_final_amount"), // final payout after proof-of-play confirmed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bookings_screen_id").on(table.screenId),
  index("idx_bookings_campaign_id").on(table.campaignId),
  index("idx_bookings_status").on(table.status),
  index("idx_bookings_screen_status").on(table.screenId, table.status),
  index("idx_bookings_created_at").on(table.createdAt),
]);

// Payments table - transaction records (Razorpay integration)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id"),
  campaignId: varchar("campaign_id"), // Direct campaign reference for campaign-level payments
  advertiserId: varchar("advertiser_id"), // Direct advertiser reference
  amount: integer("amount").notNull(), // Amount in paise (INR minor units)
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  method: text("method").notNull().default("razorpay"), // razorpay
  gatewayOrderId: text("gateway_order_id"), // Razorpay order_id
  gatewayPaymentId: text("gateway_payment_id"), // Razorpay payment_id (after verification)
  gatewaySignature: text("gateway_signature"), // Razorpay signature for verification
  invoiceId: varchar("invoice_id"), // FK to invoices
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payments_booking_id").on(table.bookingId),
  index("idx_payments_campaign_id").on(table.campaignId),
  index("idx_payments_advertiser_id").on(table.advertiserId),
  index("idx_payments_status").on(table.status),
  index("idx_payments_gateway_order").on(table.gatewayOrderId),
]);

// Owner Payouts table - admin-controlled payouts to screen owners
export const ownerPayouts = pgTable("owner_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  ownerId: varchar("owner_id").notNull(),
  campaignId: varchar("campaign_id").notNull(),
  screenId: varchar("screen_id").notNull(),
  totalOwnerAmount: integer("total_owner_amount").notNull(), // Full amount owed to owner for this booking
  payoutAmount: integer("payout_amount").notNull(), // This specific installment amount
  platformCommission: integer("platform_commission").notNull().default(0), // Amount kept by platform for this installment
  payoutNumber: integer("payout_number").notNull().default(1), // 1, 2, 3... for multi-installment tracking
  payoutType: text("payout_type").notNull().default("advance"), // "advance" | "final"
  proofOfPlayId: varchar("proof_of_play_id"), // FK to proof_of_play (required for final payouts)
  status: text("status").notNull().default("pending_admin"), // pending_admin, initiated, pending_owner_accept, accepted, processed, expired, failed
  adminInitiatedBy: varchar("admin_initiated_by"), // Admin user ID
  adminInitiatedAt: timestamp("admin_initiated_at"),
  ownerAcceptedAt: timestamp("owner_accepted_at"),
  processedAt: timestamp("processed_at"),
  expiresAt: timestamp("expires_at"), // 5-min acceptance window
  adminNotes: text("admin_notes"),
  transactionRef: text("transaction_ref"), // Bank transfer UTR / reference number
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_owner_payouts_booking_id").on(table.bookingId),
  index("idx_owner_payouts_owner_id").on(table.ownerId),
  index("idx_owner_payouts_campaign_id").on(table.campaignId),
  index("idx_owner_payouts_status").on(table.status),
  index("idx_owner_payouts_expires").on(table.expiresAt),
]);

// Invoices table - GST-compliant invoicing
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(), // Sequential: PS-INV-2026-0001
  type: text("type").notNull(), // "advertiser" (payment receipt) | "owner_payout" (payout receipt)
  advertiserId: varchar("advertiser_id"), // FK to users (for advertiser invoices)
  ownerId: varchar("owner_id"), // FK to users (for owner payout invoices)
  campaignId: varchar("campaign_id"),
  bookingId: varchar("booking_id"),
  payoutId: varchar("payout_id"), // FK to owner_payouts (for owner invoices)
  subtotal: integer("subtotal").notNull(), // Amount before tax
  gstPercent: integer("gst_percent").notNull().default(18),
  gstAmount: integer("gst_amount").notNull(), // Computed: subtotal * gstPercent / 100
  totalAmount: integer("total_amount").notNull(), // subtotal + gstAmount
  advertiserGst: text("advertiser_gst"), // Advertiser GST number (from profile)
  platformGst: text("platform_gst"), // Pixelspot GST number
  status: text("status").notNull().default("draft"), // draft, issued, paid
  pdfUrl: text("pdf_url"), // Generated PDF storage URL
  issuedAt: timestamp("issued_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_invoices_advertiser_id").on(table.advertiserId),
  index("idx_invoices_owner_id").on(table.ownerId),
  index("idx_invoices_campaign_id").on(table.campaignId),
  index("idx_invoices_status").on(table.status),
  index("idx_invoices_number").on(table.invoiceNumber),
]);

// Proof of Play table - owner uploads proof, admin verifies, advertiser confirms
export const proofOfPlay = pgTable("proof_of_play", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  campaignId: varchar("campaign_id").notNull(),
  screenId: varchar("screen_id").notNull(),
  ownerId: varchar("owner_id").notNull(),
  fileUrls: jsonb("file_urls").$type<Array<{ url: string; type: "photo" | "video" | "log"; caption?: string }>>().notNull(),
  ownerNotes: text("owner_notes"),
  // Admin verification
  adminVerified: boolean("admin_verified").notNull().default(false),
  adminVerifiedBy: varchar("admin_verified_by"),
  adminVerifiedAt: timestamp("admin_verified_at"),
  adminNotes: text("admin_notes"),
  // Advertiser confirmation
  advertiserConfirmed: boolean("advertiser_confirmed").notNull().default(false),
  advertiserConfirmedAt: timestamp("advertiser_confirmed_at"),
  advertiserNotes: text("advertiser_notes"),
  // Status: pending → admin_verified → confirmed → disputed
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_proof_of_play_booking_id").on(table.bookingId),
  index("idx_proof_of_play_campaign_id").on(table.campaignId),
  index("idx_proof_of_play_owner_id").on(table.ownerId),
  index("idx_proof_of_play_status").on(table.status),
]);

// Notifications table - in-app notification center
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Target recipient
  type: text("type").notNull(), // payment_required, payment_received, payout_incoming, payout_expired, creative_approved, creative_rejected, booking_approved, booking_rejected, campaign_live, campaign_completed
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, any>>(), // Contextual payload: campaignId, bookingId, payoutId, etc.
  actionUrl: text("action_url"), // Deep link to relevant page
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_user_read").on(table.userId, table.isRead),
  index("idx_notifications_created_at").on(table.createdAt),
]);

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
  tagAssignments: many(screenTagAssignments),
}));

// Screen Tags relations
export const screenTagsRelations = relations(screenTags, ({ many }) => ({
  assignments: many(screenTagAssignments),
}));

export const screenTagAssignmentsRelations = relations(screenTagAssignments, ({ one }) => ({
  screen: one(screens, {
    fields: [screenTagAssignments.screenId],
    references: [screens.id],
  }),
  tag: one(screenTags, {
    fields: [screenTagAssignments.tagId],
    references: [screenTags.id],
  }),
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
  campaign: one(campaigns, {
    fields: [payments.campaignId],
    references: [campaigns.id],
  }),
  advertiser: one(users, {
    fields: [payments.advertiserId],
    references: [users.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

// Owner Payouts relations
export const ownerPayoutsRelations = relations(ownerPayouts, ({ one }) => ({
  booking: one(bookings, {
    fields: [ownerPayouts.bookingId],
    references: [bookings.id],
  }),
  owner: one(users, {
    fields: [ownerPayouts.ownerId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [ownerPayouts.campaignId],
    references: [campaigns.id],
  }),
  screen: one(screens, {
    fields: [ownerPayouts.screenId],
    references: [screens.id],
  }),
}));

// Invoices relations
export const invoicesRelations = relations(invoices, ({ one }) => ({
  advertiser: one(users, {
    fields: [invoices.advertiserId],
    references: [users.id],
  }),
  owner: one(users, {
    fields: [invoices.ownerId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [invoices.campaignId],
    references: [campaigns.id],
  }),
}));

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Proof of Play relations
export const proofOfPlayRelations = relations(proofOfPlay, ({ one }) => ({
  booking: one(bookings, {
    fields: [proofOfPlay.bookingId],
    references: [bookings.id],
  }),
  campaign: one(campaigns, {
    fields: [proofOfPlay.campaignId],
    references: [campaigns.id],
  }),
  screen: one(screens, {
    fields: [proofOfPlay.screenId],
    references: [screens.id],
  }),
  owner: one(users, {
    fields: [proofOfPlay.ownerId],
    references: [users.id],
  }),
}));

// AI Conversations table - session-based chat with context persistence
export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title"), // Auto-generated from first message or user-set
  websiteUrl: text("website_url"), // Cached website context
  websiteContext: text("website_context"), // Scraped website content (title, description, text)
  websiteContextExpiry: timestamp("website_context_expiry"), // Re-scrape after 24 hours
  campaignType: text("campaign_type"), // brand_awareness, product_launch, etc.
  messageCount: integer("message_count").notNull().default(0),
  totalTokensUsed: integer("total_tokens_used").notNull().default(0),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_conversations_user_id").on(table.userId),
  index("idx_ai_conversations_last_message").on(table.lastMessageAt),
]);

// AI Messages table - individual messages in conversations
export const aiMessages = pgTable("ai_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  screenRecommendations: jsonb("screen_recommendations").$type<{
    id: string;
    name: string;
    venueName: string;
    city: string;
    score: number;
    pricePerDay: number;
    reason: string;
  }[]>(), // Only for assistant messages with recommendations
  tokensUsed: integer("tokens_used"), // Estimated tokens for this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_messages_conversation_id").on(table.conversationId),
]);

// AI Rate Limiting table - prevent abuse
export const aiRateLimits = pgTable("ai_rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actionType: text("action_type").notNull(), // "message" or "new_conversation"
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("idx_ai_rate_limits_user_action").on(table.userId, table.actionType),
  index("idx_ai_rate_limits_expires").on(table.expiresAt),
]);

// AI Conversations Relations
export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const aiRateLimitsRelations = relations(aiRateLimits, ({ one }) => ({
  user: one(users, {
    fields: [aiRateLimits.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
  lastLoginIp: true,
});

export const insertScreenSchema = createInsertSchema(screens).omit({
  id: true,
  createdAt: true,
  status: true,
}).transform((data) => ({
  ...data,
  city: normalizeCityName(data.city),
  venueCategory: normalizeVenueCategory(data.venueCategory),
}));

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

export const insertOwnerPayoutSchema = createInsertSchema(ownerPayouts).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertProofOfPlaySchema = createInsertSchema(proofOfPlay).omit({
  id: true,
  createdAt: true,
});

export const insertScreenTagSchema = createInsertSchema(screenTags).omit({
  id: true,
  createdAt: true,
});

export const insertScreenTagAssignmentSchema = createInsertSchema(screenTagAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  messageCount: true,
  totalTokensUsed: true,
  lastMessageAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAiRateLimitSchema = createInsertSchema(aiRateLimits).omit({
  id: true,
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

// OTP Storage table (DB-backed for PM2 cluster mode support)
export const otps = pgTable("otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),     // email or mobile
  code: varchar("code", { length: 6 }).notNull(),
  type: text("type").notNull(),                  // 'email' or 'mobile'
  target: text("target").notNull(),              // email address, mobile number, or userId
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idx_otps_identifier: index("idx_otps_identifier").on(table.identifier),
  idx_otps_expires: index("idx_otps_expires").on(table.expiresAt),
}));

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

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;

export type AiRateLimit = typeof aiRateLimits.$inferSelect;
export type InsertAiRateLimit = z.infer<typeof insertAiRateLimitSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type ScreenTag = typeof screenTags.$inferSelect;
export type InsertScreenTag = z.infer<typeof insertScreenTagSchema>;

export type ScreenTagAssignment = typeof screenTagAssignments.$inferSelect;
export type InsertScreenTagAssignment = z.infer<typeof insertScreenTagAssignmentSchema>;

export type OwnerPayout = typeof ownerPayouts.$inferSelect;
export type InsertOwnerPayout = z.infer<typeof insertOwnerPayoutSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ProofOfPlay = typeof proofOfPlay.$inferSelect;
export type InsertProofOfPlay = z.infer<typeof insertProofOfPlaySchema>;
