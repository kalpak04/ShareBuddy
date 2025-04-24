import { users, files, type User, type InsertUser, type File, type InsertFile } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  currentUserId: number;
  currentFileId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.currentUserId = 1;
    this.currentFileId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
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

export const storage = new MemStorage();
