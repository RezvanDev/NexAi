
import { db } from "./db";
import { calls, type InsertCall, type Call } from "@shared/schema";
import { eq } from "drizzle-orm";
import { chatStorage, type IChatStorage } from "./replit_integrations/chat/storage";

export interface IStorage extends IChatStorage {
  createCall(call: InsertCall): Promise<Call>;
  endCall(id: number, duration: number, transcript?: string): Promise<Call>;
  getCall(id: number): Promise<Call | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Chat Integration Methods
  async getConversation(id: number) { return chatStorage.getConversation(id); }
  async getAllConversations() { return chatStorage.getAllConversations(); }
  async createConversation(title: string) { return chatStorage.createConversation(title); }
  async deleteConversation(id: number) { return chatStorage.deleteConversation(id); }
  async getMessagesByConversation(id: number) { return chatStorage.getMessagesByConversation(id); }
  async createMessage(id: number, role: string, content: string) { return chatStorage.createMessage(id, role, content); }

  // Call Methods
  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(insertCall).returning();
    return call;
  }

  async endCall(id: number, duration: number, transcript?: string): Promise<Call> {
    const [call] = await db
      .update(calls)
      .set({ 
        duration, 
        transcript, 
        endedAt: new Date() 
      })
      .where(eq(calls.id, id))
      .returning();
    return call;
  }

  async getCall(id: number): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }
}

export const storage = new DatabaseStorage();
