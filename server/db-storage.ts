import { users, files, type User, type InsertUser, type File, type InsertFile } from "@shared/schema";
import session from "express-session";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserStorageUsed(id: number, size: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const [updatedUser] = await db
      .update(users)
      .set({ storageUsed: (user.storageUsed || 0) + size })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getFiles(userId: number): Promise<File[]> {
    return db.select().from(files).where(eq(files.userId, userId));
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.category, category)));
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async createFile(fileData: InsertFile & { userId: number }): Promise<File> {
    const [file] = await db
      .insert(files)
      .values({
        ...fileData,
        status: "pending",
        uploaded: false
      })
      .returning();
    return file;
  }

  async updateFileStatus(id: number, status: string): Promise<File | undefined> {
    const [updatedFile] = await db
      .update(files)
      .set({
        status,
        uploaded: status === "backed_up"
      })
      .where(eq(files.id, id))
      .returning();
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    const [deletedFile] = await db
      .delete(files)
      .where(eq(files.id, id))
      .returning();
    return !!deletedFile;
  }

  // Method to initialize test data for demonstration
  async seedTestData(): Promise<void> {
    // Helper function to hash passwords
    const scryptAsync = promisify(scrypt);
    const hashPassword = async (password: string) => {
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      return `${buf.toString("hex")}.${salt}`;
    };

    // Check if data already exists
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed");
      return;
    }

    console.log("Seeding database with test data...");
    
    try {
      // Super admin user
      const superAdmin = {
        username: "admin",
        password: await hashPassword("Admin@123"),
        email: "admin@sharebuddy.com",
        fullName: "Super Admin",
        role: "both",
        storageReserved: 102400, // 100GB
        storageShared: 204800,   // 200GB
        earnings: 50000,         // ₹500
        stripeCustomerId: null,
        stripeSubscriptionId: null
      };
      
      // Regular users with different roles
      const testUsers = [
        {
          username: "provider",
          password: await hashPassword("Provider@123"),
          email: "provider@example.com",
          fullName: "Provider User",
          role: "provider",
          storageReserved: 0,
          storageUsed: 0,
          storageShared: 51200,  // 50GB
          earnings: 2000,        // ₹20
          stripeCustomerId: null,
          stripeSubscriptionId: null
        },
        {
          username: "renter",
          password: await hashPassword("Renter@123"),
          email: "renter@example.com",
          fullName: "Renter User",
          role: "renter",
          storageReserved: 20480, // 20GB
          storageUsed: 10240,     // 10GB used
          storageShared: 0,
          earnings: 0,
          stripeCustomerId: null,
          stripeSubscriptionId: null
        },
        {
          username: "both",
          password: await hashPassword("Both@123"),
          email: "both@example.com",
          fullName: "Dual Role User",
          role: "both",
          storageReserved: 30720, // 30GB
          storageUsed: 15360,     // 15GB used
          storageShared: 51200,   // 50GB shared
          earnings: 1500,         // ₹15
          stripeCustomerId: null,
          stripeSubscriptionId: null
        }
      ];

      // Insert all users
      const [adminUser] = await db.insert(users).values(superAdmin).returning();
      const insertedUsers = await db.insert(users).values(testUsers).returning();
      const allUsers = [adminUser, ...insertedUsers];
      
      // Create some sample files for test users
      const fileCategories = ["photos", "videos", "documents", "apps"];
      const fileExtensions = {
        photos: ["jpg", "png", "gif"],
        videos: ["mp4", "mov", "avi"],
        documents: ["pdf", "docx", "txt"],
        apps: ["apk", "ipa", "exe"]
      };
      
      const mimeTypes = {
        jpg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        mp4: "video/mp4",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        txt: "text/plain",
        apk: "application/vnd.android.package-archive",
        ipa: "application/octet-stream",
        exe: "application/x-msdownload"
      };
      
      // Create sample files for "renter" and "both" users
      for (const user of allUsers) {
        if (user.role === "renter" || user.role === "both") {
          for (const category of fileCategories) {
            // Create 2-3 files per category
            const numFiles = Math.floor(Math.random() * 2) + 2;
            
            for (let i = 0; i < numFiles; i++) {
              const extensions = fileExtensions[category as keyof typeof fileExtensions];
              const extension = extensions[Math.floor(Math.random() * extensions.length)];
              const mime = mimeTypes[extension as keyof typeof mimeTypes];
              
              // Generate random file size between 50KB and 500MB
              const size = Math.floor(Math.random() * 500 * 1024 * 1024) + 50 * 1024;
              
              await db.insert(files).values({
                userId: user.id,
                name: `${category}_sample_${i + 1}.${extension}`,
                size: size,
                type: mime,
                category: category,
                path: `/user_files/${user.username}/${category}/`,
                status: i % 3 === 0 ? "backed_up" : i % 3 === 1 ? "backing_up" : "pending",
                uploaded: i % 3 === 0
              });
            }
          }
        }
      }
      
      console.log("Database seeded successfully!");
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  }
}

import { promisify } from "util";
import { scrypt, randomBytes } from "crypto";