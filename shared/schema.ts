import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: text("role").default("renter"), // "renter", "provider", or "both"
  storageReserved: integer("storage_reserved").default(0), // in MB
  storageUsed: integer("storage_used").default(0), // in MB
  storageShared: integer("storage_shared").default(0), // in MB for providers
  earnings: integer("earnings").default(0), // in paisa (1/100 of rupee)
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(), // in bytes
  type: text("type").notNull(), // mimetype
  category: text("category"), // "photos", "videos", "documents", "apps"
  path: text("path"), // virtual path
  status: text("status").default("pending"), // "pending", "backing_up", "backed_up"
  uploaded: boolean("uploaded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  size: true,
  type: true,
  category: true,
  path: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
