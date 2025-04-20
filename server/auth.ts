import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, registerSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Function to initialize default admin account
async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      console.log("Creating default admin account...");
      await storage.createUser({
        username: "admin",
        password: await hashPassword("admin123"),
        role: "admin",
        fullName: "System Administrator",
        email: "admin@familytaxi.com",
        phone: "0000000000",
        profilePicture: "",
      });
      console.log("Default admin account created successfully.");
    }
  } catch (error) {
    console.error("Error creating default admin account:", error);
  }
}

export function setupAuth(app: Express) {
  // Create default admin account
  createDefaultAdmin();

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "family-taxi-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register - passenger only
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate registration data
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ errors: result.error.format() });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...result.data,
        password: await hashPassword(result.data.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't return the full user object with password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin API to create any type of user
  app.post("/api/admin/users", async (req, res, next) => {
    try {
      // Check if the user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Admin API to get all users
  app.get("/api/admin/users", async (req, res) => {
    try {
      // Check if the user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }

      const users = await storage.getAllUsers();
      
      // Don't return passwords
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving users" });
    }
  });

  // Admin API to delete a user
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      // Check if the user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }

      const userId = parseInt(req.params.id);
      
      // Don't allow deleting your own account
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own admin account" });
      }
      
      await storage.deleteUser(userId);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Don't return the password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't return the password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
}
