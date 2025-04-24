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
  
  // Payment Routes
  app.post("/api/payments/storage-rental", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { providerId, storageAmount } = req.body;
      
      if (!providerId || isNaN(parseInt(providerId))) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      if (!storageAmount || isNaN(parseInt(storageAmount))) {
        return res.status(400).json({ message: "Invalid storage amount" });
      }
      
      // Import the payment service
      const { PaymentService } = await import("./payment");
      
      // Standard pricing is 1 rupee per GB per month
      const pricePerGB = 1;
      
      // Process payment
      const paymentResult = await PaymentService.processStorageRental(
        req.user!.id,
        parseInt(providerId),
        parseInt(storageAmount),
        pricePerGB
      );
      
      res.status(200).json(paymentResult);
    } catch (error: any) {
      console.error("Payment error:", error);
      res.status(500).json({ message: error.message || "Payment processing failed" });
    }
  });
  
  // Endpoint to confirm a successful payment and update provider earnings
  app.post("/api/payments/confirm", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { paymentIntentId, providerId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Missing payment intent ID" });
      }
      
      if (!providerId || isNaN(parseInt(providerId))) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      // Import the payment service
      const { PaymentService } = await import("./payment");
      
      // Confirm payment and update provider earnings
      const result = await PaymentService.confirmProviderEarnings(
        paymentIntentId,
        parseInt(providerId)
      );
      
      // Update storage allocation for the renter
      const { storageAmount } = req.body;
      if (storageAmount && !isNaN(parseInt(storageAmount))) {
        const renter = await storage.getUser(req.user!.id);
        if (renter) {
          const currentReserved = renter.storageReserved || 0;
          await storage.updateUser(req.user!.id, {
            storageReserved: currentReserved + parseInt(storageAmount)
          });
        }
      }
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Payment confirmation error:", error);
      res.status(500).json({ message: error.message || "Payment confirmation failed" });
    }
  });
  
  // Create subscription for premium features
  app.post("/api/payments/subscription", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Missing plan ID" });
      }
      
      // Import the payment service
      const { PaymentService } = await import("./payment");
      
      // Create subscription
      const result = await PaymentService.createSubscription(
        req.user!.id,
        planId
      );
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(500).json({ message: error.message || "Subscription creation failed" });
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

  // P2P routes for storage providers
  app.post("/api/p2p/node/register", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Import P2P tunnel dynamically to avoid circular dependencies
      const { StorageController } = await import("./p2p");
      const storageController = new StorageController();
      
      // Get storage amount from request
      const { storageTotal, geolocation } = req.body;
      if (!storageTotal || isNaN(parseInt(storageTotal))) {
        return res.status(400).json({ message: "Invalid storage amount" });
      }
      
      // Register the node
      const result = await storageController.registerNode(
        req.user!.id, 
        parseInt(storageTotal),
        geolocation
      );
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Node registration error:", error);
      res.status(500).json({ message: "Failed to register storage node" });
    }
  });
  
  // Route for file distribution
  app.post("/api/p2p/file/distribute/:fileId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      // Get the file from storage
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (file.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to distribute this file" });
      }
      
      // In a real implementation, we would get the actual file data here
      // For this demo, we'll simulate file data
      const { StorageController } = await import("./p2p");
      const storageController = new StorageController();
      
      // Normally we'd get the file from storage, but for demo purposes:
      const mockFileData = Buffer.from(`This is mock data for file ${fileId}`);
      
      // Process the file for distribution
      const result = await storageController.processFileForDistribution(
        fileId,
        req.user!.id,
        mockFileData,
        req.body.reliability || 3
      );
      
      res.json(result);
    } catch (error) {
      console.error("File distribution error:", error);
      res.status(500).json({ message: "Failed to distribute file" });
    }
  });
  
  // Route for file retrieval
  app.get("/api/p2p/file/retrieve/:fileId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      // Initialize storage controller
      const { StorageController } = await import("./p2p");
      const storageController = new StorageController();
      
      // Retrieve the file
      const result = await storageController.retrieveFile(fileId, req.user!.id);
      
      res.json(result);
    } catch (error) {
      console.error("File retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve file" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize P2P tunnel
  import("./p2p").then(({ initializeP2P }) => {
    initializeP2P(httpServer);
    console.log("P2P tunnel initialized");
  }).catch(error => {
    console.error("Failed to initialize P2P tunnel:", error);
  });
  
  return httpServer;
}
