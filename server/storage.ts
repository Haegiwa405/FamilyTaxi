import { users, trips, locations, type User, type InsertUser, type Trip, type InsertTrip, type Location, type InsertLocation } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLocation(userId: number, latitude: number, longitude: number): Promise<User>;
  updateDriverStatus(userId: number, isOnline: boolean): Promise<User>;
  updateDriverRating(driverId: number): Promise<void>;
  updatePassengerRating(passengerId: number): Promise<void>;
  incrementDriverTripCount(driverId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: number): Promise<void>;

  // Location operations
  createLocation(location: InsertLocation): Promise<Location>;
  getUserLocations(userId: number): Promise<Location[]>;

  // Trip operations
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getRecentTrips(userId: number): Promise<Trip[]>;
  getPendingTrips(): Promise<Trip[]>;
  getDriverActiveTrip(driverId: number): Promise<Trip | undefined>;
  updateTripStatus(tripId: number, status: string): Promise<Trip>;
  acceptTrip(tripId: number, driverId: number): Promise<Trip>;
  startTrip(tripId: number): Promise<Trip>;
  completeTrip(tripId: number): Promise<Trip>;
  rateTrip(tripId: number, raterRole: 'passenger' | 'driver', rating: number, review: string): Promise<Trip>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLocation(userId: number, latitude: number, longitude: number): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        currentLatitude: latitude,
        currentLongitude: longitude,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }

  async updateDriverStatus(userId: number, isOnline: boolean): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "driver") {
      throw new Error("User is not a driver");
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isOnline })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async updateDriverRating(driverId: number): Promise<void> {
    // Get all completed trips for this driver that have driver ratings
    const driverTrips = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.driverId, driverId),
          eq(trips.status, "completed")
        )
      );

    if (!driverTrips.length) {
      return; // No trips to update ratings
    }

    const tripsWithRatings = driverTrips.filter(trip => trip.driverRating !== null);
    
    if (!tripsWithRatings.length) {
      return; // No ratings to calculate
    }

    // Calculate average rating
    const totalRating = tripsWithRatings.reduce(
      (sum, trip) => sum + (trip.driverRating || 0),
      0
    );
    const avgRating = totalRating / tripsWithRatings.length;

    // Update driver rating
    await db
      .update(users)
      .set({ rating: avgRating })
      .where(eq(users.id, driverId));
  }

  async updatePassengerRating(passengerId: number): Promise<void> {
    // Get all completed trips for this passenger that have passenger ratings
    const passengerTrips = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.passengerId, passengerId),
          eq(trips.status, "completed")
        )
      );

    if (!passengerTrips.length) {
      return; // No trips to update ratings
    }

    const tripsWithRatings = passengerTrips.filter(trip => trip.passengerRating !== null);
    
    if (!tripsWithRatings.length) {
      return; // No ratings to calculate
    }

    // Calculate average rating
    const totalRating = tripsWithRatings.reduce(
      (sum, trip) => sum + (trip.passengerRating || 0),
      0
    );
    const avgRating = totalRating / tripsWithRatings.length;

    // Update passenger rating
    await db
      .update(users)
      .set({ rating: avgRating })
      .where(eq(users.id, passengerId));
  }

  async incrementDriverTripCount(driverId: number): Promise<void> {
    const [driver] = await db.select().from(users).where(eq(users.id, driverId));

    if (!driver) {
      throw new Error("Driver not found");
    }

    await db
      .update(users)
      .set({ tripCount: (driver.tripCount || 0) + 1 })
      .where(eq(users.id, driverId));
  }
  
  async deleteUser(userId: number): Promise<void> {
    // First check if user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Delete user's locations
    await db.delete(locations).where(eq(locations.userId, userId));
    
    // Handle trips - set to cancelled if they are active and not completed
    await db
      .update(trips)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(trips.passengerId, userId),
          or(
            eq(trips.status, "requested"),
            eq(trips.status, "accepted"),
            eq(trips.status, "in_progress")
          )
        )
      );
    
    // If user is a driver, handle their trips
    if (user.role === "driver") {
      await db
        .update(trips)
        .set({ 
          status: "requested",
          driverId: null,
          acceptedAt: null 
        })
        .where(
          and(
            eq(trips.driverId, userId),
            or(
              eq(trips.status, "accepted"),
              eq(trips.status, "in_progress")
            )
          )
        );
    }
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  // Location operations
  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async getUserLocations(userId: number): Promise<Location[]> {
    return db.select().from(locations).where(eq(locations.userId, userId));
  }

  // Trip operations
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db
      .insert(trips)
      .values({
        ...trip,
        status: "requested",
        driverId: null,
      })
      .returning();

    return newTrip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async getRecentTrips(userId: number): Promise<Trip[]> {
    return db
      .select()
      .from(trips)
      .where(eq(trips.passengerId, userId))
      .orderBy(desc(trips.requestedAt))
      .limit(10);
  }

  async getPendingTrips(): Promise<Trip[]> {
    return db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.status, "requested"),
          isNull(trips.driverId)
        )
      )
      .orderBy(trips.requestedAt);
  }

  async getDriverActiveTrip(driverId: number): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.driverId, driverId),
          or(
            eq(trips.status, "accepted"),
            eq(trips.status, "in_progress")
          )
        )
      );

    return trip;
  }

  async updateTripStatus(tripId: number, status: string): Promise<Trip> {
    const [updatedTrip] = await db
      .update(trips)
      .set({ status })
      .where(eq(trips.id, tripId))
      .returning();

    if (!updatedTrip) {
      throw new Error("Trip not found");
    }

    return updatedTrip;
  }

  async acceptTrip(tripId: number, driverId: number): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status !== "requested") {
      throw new Error("Trip is not available for acceptance");
    }

    const now = new Date();
    const [updatedTrip] = await db
      .update(trips)
      .set({
        status: "accepted",
        driverId,
        acceptedAt: now,
      })
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  }

  async startTrip(tripId: number): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status !== "accepted") {
      throw new Error("Trip is not in accepted state");
    }

    const now = new Date();
    const [updatedTrip] = await db
      .update(trips)
      .set({
        status: "in_progress",
        startedAt: now,
      })
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  }

  async completeTrip(tripId: number): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status !== "in_progress") {
      throw new Error("Trip is not in progress");
    }

    const now = new Date();
    const [updatedTrip] = await db
      .update(trips)
      .set({
        status: "completed",
        completedAt: now,
      })
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  }

  async rateTrip(
    tripId: number,
    raterRole: 'passenger' | 'driver',
    rating: number,
    review: string
  ): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status !== "completed") {
      throw new Error("Can only rate completed trips");
    }

    let updateData: Partial<Trip> = {};

    if (raterRole === 'passenger') {
      updateData = {
        driverRating: rating,
        driverReview: review,
      };
    } else {
      updateData = {
        passengerRating: rating,
        passengerReview: review,
      };
    }

    const [updatedTrip] = await db
      .update(trips)
      .set(updateData)
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  }
}

export const storage = new DatabaseStorage();
