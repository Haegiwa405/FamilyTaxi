import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("passenger"), // "passenger", "driver", or "admin"
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  profilePicture: text("profile_picture"),
  rating: real("rating").default(5.0),
  tripCount: integer("trip_count").default(0),
  currentLatitude: real("current_latitude"),
  currentLongitude: real("current_longitude"),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Location model
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Trip model
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").notNull(),
  driverId: integer("driver_id"),
  status: text("status").notNull().default("requested"), // requested, accepted, in_progress, completed, cancelled
  pickupAddress: text("pickup_address").notNull(),
  pickupLatitude: real("pickup_latitude").notNull(),
  pickupLongitude: real("pickup_longitude").notNull(),
  destinationAddress: text("destination_address").notNull(),
  destinationLatitude: real("destination_latitude").notNull(),
  destinationLongitude: real("destination_longitude").notNull(),
  distance: real("distance").notNull(), // in kilometers
  baseFare: real("base_fare").notNull(),
  perKmRate: real("per_km_rate").notNull(),
  totalFare: real("total_fare").notNull(),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  passengerRating: real("passenger_rating"),
  driverRating: real("driver_rating"),
  passengerReview: text("passenger_review"),
  driverReview: text("driver_review"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define relations after all tables are defined
export const userRelations = relations(users, ({ many }) => ({
  locations: many(locations),
  passengerTrips: many(trips, { relationName: "passengerTrips" }),
  driverTrips: many(trips, { relationName: "driverTrips" }),
}));

export const locationRelations = relations(locations, ({ one }) => ({
  user: one(users, {
    fields: [locations.userId],
    references: [users.id],
  }),
}));

export const tripRelations = relations(trips, ({ one }) => ({
  passenger: one(users, {
    fields: [trips.passengerId],
    references: [users.id],
    relationName: "passengerTrips",
  }),
  driver: one(users, {
    fields: [trips.driverId],
    references: [users.id],
    relationName: "driverTrips",
  }),
}));

// Schemas for data validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  email: true,
  phone: true,
  profilePicture: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  driverId: true,
  status: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  passengerRating: true,
  driverRating: true,
  passengerReview: true,
  driverReview: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

// Role enum
export const roleEnum = z.enum(["passenger", "driver", "admin"]);

// Additional schemas for API requests
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number is required"),
  role: z.literal("passenger"),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number is required"),
  role: roleEnum,
});

export const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const locationSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

export const tripAcceptSchema = z.object({
  tripId: z.number(),
});

export const tripStatusUpdateSchema = z.object({
  tripId: z.number(),
  status: z.enum(["accepted", "in_progress", "completed", "cancelled"]),
});

export const tripRatingSchema = z.object({
  tripId: z.number(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateLocationData = z.infer<typeof updateLocationSchema>;
export type LocationSearchData = z.infer<typeof locationSearchSchema>;
export type TripAcceptData = z.infer<typeof tripAcceptSchema>;
export type TripStatusUpdateData = z.infer<typeof tripStatusUpdateSchema>;
export type TripRatingData = z.infer<typeof tripRatingSchema>;
