
import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  duration: integer("duration"),
  summary: text("summary"),
  transcript: text("transcript"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const insertCallSchema = createInsertSchema(calls).omit({ 
  id: true, 
  startedAt: true, 
  endedAt: true 
});

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

export * from "./models/chat";
