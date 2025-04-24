import { users, files, type User, type InsertUser, type File, type InsertFile } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { promisify } from "util";
import { scrypt, randomBytes } from "crypto";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserStorageUsed(id: number, size: number): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  
  // File methods
  getFiles(userId: number): Promise<File[]>;
  getFilesByCategory(userId: number, category: string): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile & { userId: number }): Promise<File>;
  updateFileStatus(id: number, status: string): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  currentUserId: number;
  currentFileId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.currentUserId = 1;
    this.currentFileId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
    
    // Initialize with test users
    this.initializeTestUsers();
  }
  
  private async initializeTestUsers() {
    // Super admin user
    const superAdmin = {
      username: "admin",
      password: "Admin@123",
      email: "admin@sharebuddy.com",
      fullName: "Super Admin"
    };
    
    // Regular users with different roles
    const testUsers = [
      {
        username: "provider",
        password: "Provider@123",
        email: "provider@example.com",
        fullName: "Provider User"
      },
      {
        username: "renter",
        password: "Renter@123",
        email: "renter@example.com",
        fullName: "Renter User"
      },
      {
        username: "both",
        password: "Both@123",
        email: "both@example.com",
        fullName: "Dual Role User"
      }
    ];
    
    // Create the super admin with pre-configured storage
    const scryptAsync = promisify(scrypt);
    const hashPassword = async (password: string) => {
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      return `${buf.toString("hex")}.${salt}`;
    };
    
    // Add super admin
    const adminUser = await this.createUser({
      ...superAdmin,
      password: await hashPassword(superAdmin.password)
    });
    
    // Configure admin with special privileges
    await this.updateUser(adminUser.id, {
      role: "both",
      storageReserved: 102400, // 100GB
      storageShared: 204800,   // 200GB
      earnings: 50000         // ₹500
    });
    
    // Add test users
    for (const user of testUsers) {
      const newUser = await this.createUser({
        ...user,
        password: await hashPassword(user.password)
      });
      
      // Setup user roles and storage based on username
      if (user.username === "provider") {
        await this.updateUser(newUser.id, {
          role: "provider",
          storageShared: 51200,  // 50GB
          earnings: 2000         // ₹20
        });
      } else if (user.username === "renter") {
        await this.updateUser(newUser.id, {
          role: "renter",
          storageReserved: 20480, // 20GB
          storageUsed: 10240      // 10GB used
        });
      } else if (user.username === "both") {
        await this.updateUser(newUser.id, {
          role: "both",
          storageReserved: 30720, // 30GB
          storageUsed: 15360,     // 15GB used
          storageShared: 51200,   // 50GB shared
          earnings: 1500          // ₹15
        });
      }
    }
    
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
    for (const [id, user] of this.users.entries()) {
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
            
            await this.createFile({
              userId: id,
              name: `${category}_sample_${i + 1}.${extension}`,
              size: size,
              type: mime,
              category: category,
              path: `/user_files/${user.username}/${category}/`
            });
          }
        }
        
        // Update the status of some files to simulate completed backups
        const userFiles = await this.getFiles(id);
        for (let i = 0; i < userFiles.length; i++) {
          if (i % 3 === 0) {
            await this.updateFileStatus(userFiles[i].id, "backed_up");
          } else if (i % 3 === 1) {
            await this.updateFileStatus(userFiles[i].id, "backing_up");
          }
        }
      }
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      role: "renter", 
      storageReserved: 0, 
      storageUsed: 0, 
      storageShared: 0, 
      earnings: 0
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStorageUsed(id: number, size: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { 
      ...user, 
      storageUsed: user.storageUsed + size 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { ...user, role };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getFiles(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId
    );
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId && file.category === category
    );
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async createFile(fileData: InsertFile & { userId: number }): Promise<File> {
    const id = this.currentFileId++;
    const timestamp = new Date();
    const file: File = {
      ...fileData,
      id,
      status: "pending",
      uploaded: false,
      createdAt: timestamp
    };
    
    this.files.set(id, file);
    return file;
  }

  async updateFileStatus(id: number, status: string): Promise<File | undefined> {
    const file = await this.getFile(id);
    if (!file) return undefined;

    const updatedFile = {
      ...file,
      status,
      uploaded: status === "backed_up"
    };
    
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = await this.getFile(id);
    if (!file) return false;

    return this.files.delete(id);
  }
}

// Use database storage instead of memory storage
import { DatabaseStorage } from "./db-storage";
export const storage = new DatabaseStorage();
