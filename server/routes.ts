import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertTripSchema, 
  insertLocationSchema, 
  locationSearchSchema,
  updateLocationSchema,
  tripAcceptSchema,
  tripStatusUpdateSchema,
  tripRatingSchema,
} from "@shared/schema";
import { calculateDistance, findClosestDriver } from "../client/src/lib/maps-utils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving user" });
    }
  });
  
  app.post("/api/user/location", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const result = updateLocationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid location data" });
      }
      
      const updatedUser = await storage.updateUserLocation(
        req.user.id,
        result.data.latitude,
        result.data.longitude
      );
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating location" });
    }
  });
  
  app.post("/api/driver/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const { isOnline } = req.body;
      
      if (typeof isOnline !== "boolean") {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedUser = await storage.updateDriverStatus(req.user.id, isOnline);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating status" });
    }
  });

  // Location routes
  app.get("/api/locations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const locations = await storage.getUserLocations(req.user.id);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving locations" });
    }
  });
  
  app.post("/api/locations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const result = insertLocationSchema.safeParse({
        ...req.body,
        userId: req.user.id,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid location data" });
      }
      
      const location = await storage.createLocation(result.data);
      res.status(201).json(location);
    } catch (error) {
      res.status(500).json({ message: "Error creating location" });
    }
  });
  
  app.post("/api/locations/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const result = locationSearchSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid search query" });
      }
      
      // In a real app, this would call the Google Places API
      // For demo purposes, just return saved locations that match the query
      const locations = await storage.getUserLocations(req.user.id);
      const filteredLocations = locations.filter(location => 
        location.name.toLowerCase().includes(result.data.query.toLowerCase()) ||
        location.address.toLowerCase().includes(result.data.query.toLowerCase())
      );
      
      res.json(filteredLocations);
    } catch (error) {
      res.status(500).json({ message: "Error searching locations" });
    }
  });

  // Passenger trip routes
  app.get("/api/passenger/trips/recent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "passenger") return res.status(403).json({ message: "Not a passenger" });
    
    try {
      const trips = await storage.getRecentTrips(req.user.id);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving trips" });
    }
  });
  
  app.post("/api/passenger/trips", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "passenger") return res.status(403).json({ message: "Not a passenger" });
    
    try {
      const result = insertTripSchema.safeParse({
        ...req.body,
        passengerId: req.user.id,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid trip data" });
      }
      
      const trip = await storage.createTrip(result.data);
      res.status(201).json(trip);
    } catch (error) {
      res.status(500).json({ message: "Error creating trip" });
    }
  });
  
  app.get("/api/passenger/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if the authenticated user is the passenger for this trip
      if (req.user.role === "passenger" && trip.passengerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this trip" });
      }
      
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving trip" });
    }
  });
  
  app.post("/api/passenger/trips/:id/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "passenger") return res.status(403).json({ message: "Not a passenger" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.passengerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to request this trip" });
      }
      
      if (trip.status !== "requested") {
        return res.status(400).json({ message: "Trip already requested" });
      }
      
      // In a real app, this would actually search for available drivers near the pickup location
      // For demo purposes, just update the trip status
      const updatedTrip = await storage.updateTripStatus(tripId, "requested");
      
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error requesting trip" });
    }
  });
  
  app.post("/api/passenger/trips/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "passenger") return res.status(403).json({ message: "Not a passenger" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.passengerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to cancel this trip" });
      }
      
      if (trip.status === "completed" || trip.status === "cancelled") {
        return res.status(400).json({ message: "Cannot cancel a completed or already cancelled trip" });
      }
      
      const updatedTrip = await storage.updateTripStatus(tripId, "cancelled");
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error cancelling trip" });
    }
  });
  
  app.post("/api/passenger/trips/:id/rate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "passenger") return res.status(403).json({ message: "Not a passenger" });
    
    try {
      const tripId = parseInt(req.params.id);
      const result = tripRatingSchema.safeParse({
        ...req.body,
        tripId,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid rating data" });
      }
      
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.passengerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to rate this trip" });
      }
      
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed trips" });
      }
      
      if (trip.driverRating) {
        return res.status(400).json({ message: "Trip already rated" });
      }
      
      const updatedTrip = await storage.rateTrip(
        tripId,
        "driver",
        result.data.rating,
        result.data.review || ""
      );
      
      // Update driver's rating
      if (trip.driverId) {
        await storage.updateDriverRating(trip.driverId);
      }
      
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error rating trip" });
    }
  });

  // Driver trip routes
  app.get("/api/driver/trips/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const activeTrip = await storage.getDriverActiveTrip(req.user.id);
      res.json(activeTrip || null);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving active trip" });
    }
  });
  
  app.get("/api/driver/trips/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      // Check if driver is online and available
      if (!req.user.isOnline) {
        return res.json(null);
      }
      
      // Check if driver already has an active trip
      const activeTrip = await storage.getDriverActiveTrip(req.user.id);
      if (activeTrip) {
        return res.json(null);
      }
      
      // In a real app, this would search for nearby trip requests
      // based on the driver's current location
      const pendingTrips = await storage.getPendingTrips();
      
      // Find closest trip to driver's current location
      if (pendingTrips.length > 0 && req.user.currentLatitude && req.user.currentLongitude) {
        let closestTrip = pendingTrips[0];
        let minDistance = calculateDistance(
          req.user.currentLatitude,
          req.user.currentLongitude,
          closestTrip.pickupLatitude,
          closestTrip.pickupLongitude
        );
        
        for (const trip of pendingTrips) {
          const distance = calculateDistance(
            req.user.currentLatitude,
            req.user.currentLongitude,
            trip.pickupLatitude,
            trip.pickupLongitude
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestTrip = trip;
          }
        }
        
        // Only return the trip if it's within 10km
        if (minDistance <= 10) {
          return res.json(closestTrip);
        }
      }
      
      res.json(null);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving trip requests" });
    }
  });
  
  app.get("/api/driver/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if the trip is assigned to this driver
      if (trip.driverId && trip.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this trip" });
      }
      
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving trip" });
    }
  });
  
  app.post("/api/driver/trips/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.status !== "requested") {
        return res.status(400).json({ message: "Trip is not available for acceptance" });
      }
      
      // Check if driver already has an active trip
      const activeTrip = await storage.getDriverActiveTrip(req.user.id);
      if (activeTrip) {
        return res.status(400).json({ message: "Driver already has an active trip" });
      }
      
      // Accept the trip
      const updatedTrip = await storage.acceptTrip(tripId, req.user.id);
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error accepting trip" });
    }
  });
  
  app.post("/api/driver/trips/:id/decline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.status !== "requested") {
        return res.status(400).json({ message: "Trip is not available for declining" });
      }
      
      // Don't change anything, just acknowledge the decline
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error declining trip" });
    }
  });
  
  app.post("/api/driver/trips/:id/arrived", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized for this trip" });
      }
      
      if (trip.status !== "accepted") {
        return res.status(400).json({ message: "Driver not en route to pickup" });
      }
      
      // No actual status change, just acknowledge arrival
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Error updating trip" });
    }
  });
  
  app.post("/api/driver/trips/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized for this trip" });
      }
      
      if (trip.status !== "accepted") {
        return res.status(400).json({ message: "Trip not in accepted state" });
      }
      
      const updatedTrip = await storage.startTrip(tripId);
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error starting trip" });
    }
  });
  
  app.post("/api/driver/trips/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized for this trip" });
      }
      
      if (trip.status !== "in_progress") {
        return res.status(400).json({ message: "Trip not in progress" });
      }
      
      const updatedTrip = await storage.completeTrip(tripId);
      
      // Update driver stats
      await storage.incrementDriverTripCount(req.user.id);
      
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error completing trip" });
    }
  });
  
  app.post("/api/driver/trips/:id/rate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      const tripId = parseInt(req.params.id);
      const result = tripRatingSchema.safeParse({
        ...req.body,
        tripId,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid rating data" });
      }
      
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to rate this trip" });
      }
      
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed trips" });
      }
      
      if (trip.passengerRating) {
        return res.status(400).json({ message: "Trip already rated" });
      }
      
      const updatedTrip = await storage.rateTrip(
        tripId,
        "passenger",
        result.data.rating,
        result.data.review || ""
      );
      
      // Update passenger's rating
      await storage.updatePassengerRating(trip.passengerId);
      
      res.json(updatedTrip);
    } catch (error) {
      res.status(500).json({ message: "Error rating trip" });
    }
  });

  // Driver stats
  app.get("/api/driver/stats/today", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "driver") return res.status(403).json({ message: "Not a driver" });
    
    try {
      // In a real app, this would calculate actual earnings and hours
      // For demo purposes, we'll return some sample stats
      const stats = {
        tripCount: req.user.tripCount || 0,
        totalHours: (req.user.tripCount || 0) * 0.5, // Estimate 30 min per trip
        earnings: (req.user.tripCount || 0) * 13 * 0.8, // $13 average fare, driver gets 80%
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving stats" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.status(403).json({ message: "Not an admin" });
    
    try {
      const users = await storage.getAllUsers();
      
      // Don't return passwords
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving users" });
    }
  });
  
  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.status(403).json({ message: "Not an admin" });
    
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(req.body);
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.status(403).json({ message: "Not an admin" });
    
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting yourself or other admins
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (userToDelete.role === "admin") {
        return res.status(400).json({ message: "Cannot delete admin accounts" });
      }
      
      await storage.deleteUser(userId);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
