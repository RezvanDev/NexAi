import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  companyId: integer("company_id").references(() => companies.id), // null = Super Admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt"), // Override default agent instructions

  // Structured Persona Fields
  agentName: text("agent_name").default("AI Assistant"),
  agentRole: text("agent_role").default("Representative"),
  companyContext: text("company_context"), // "What do you offer?"
  voice: text("voice").default("alloy"), // Default OpenAI voice

  // Dynamic Script Configuration
  agentGreeting: text("agent_greeting").default("Здравствуйте! Чем могу помочь?"),
  agentTerminationPhrase: text("agent_termination_phrase").default("Хорошо, менеджер свяжется с вами в ближайшее время. Всего доброго."),

  // Notifications
  telegramChatId: text("telegram_chat_id"),

  // Package Limits
  limitMinutes: integer("limit_minutes").default(100),

  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  duration: integer("duration"),
  summary: text("summary"),
  transcript: text("transcript"),
  status: text("status"), // 'completed', 'missed', etc.
  recordingUrl: text("recording_url"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Zod Schemas
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertCallSchema = createInsertSchema(calls).omit({ id: true, startedAt: true, endedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export * from "./models/chat";
