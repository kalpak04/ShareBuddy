import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertFileSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // User Routes
  app.patch("/api/user/role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { role, storageShared } = req.body;
    if (!role || !["renter", "provider", "both"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      // Update user role
      const user = await storage.updateUserRole(req.user!.id, role);
      
      // If providing storage, update storageShared value
      if ((role === "provider" || role === "both") && storageShared) {
        await storage.updateUser(req.user!.id, { 
          storageShared: parseInt(storageShared)
        });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/user/storage", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { reservedStorage } = req.body;
    if (!reservedStorage || isNaN(parseInt(reservedStorage))) {
      return res.status(400).json({ message: "Invalid storage amount" });
    }

    try {
      const user = await storage.updateUser(req.user!.id, { 
        storageReserved: parseInt(reservedStorage) 
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update reserved storage" });
    }
  });

  // File Routes
  app.get("/api/files", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const files = await storage.getFiles(req.user!.id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.get("/api/files/category/:category", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { category } = req.params;
    if (!category || !["photos", "videos", "documents", "apps"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    try {
      const files = await storage.getFilesByCategory(req.user!.id, category);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files by category" });
    }
  });

  app.post("/api/files", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Validate file data
      const fileData = insertFileSchema.parse(req.body);
      
      // Check if user has enough storage
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Convert bytes to MB for comparison
      const sizeMB = Math.ceil(fileData.size / (1024 * 1024));
      if (user.storageUsed + sizeMB > user.storageReserved) {
        return res.status(400).json({ message: "Not enough storage" });
      }
      
      // Create file record
      const file = await storage.createFile({
        ...fileData,
        userId: req.user!.id
      });
      
      // Update user's storage usage
      await storage.updateUserStorageUsed(req.user!.id, sizeMB);
      
      // Mock successful file upload (in a real app, this would handle the file upload)
      // Then update the file status to simulate backup processes
      setTimeout(async () => {
        await storage.updateFileStatus(file.id, "backing_up");
        
        setTimeout(async () => {
          await storage.updateFileStatus(file.id, "backed_up");
        }, 3000); // Simulate backup completion after 3 seconds
      }, 1000); // Simulate starting the backup after 1 second
      
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }
    
    try {
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (file.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this file" });
      }
      
      await storage.deleteFile(fileId);
      
      // Update user's storage usage (reduce used storage)
      const sizeMB = Math.ceil(file.size / (1024 * 1024));
      await storage.updateUserStorageUsed(req.user!.id, -sizeMB);
      
      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
