
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { companies, calls, leads } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";
import { setupRealtime } from "./realtime";
import { registerCRMRoutes } from "../crm/server/routes";
import { generateToken } from "./livekit";
import { AgentDispatchClient } from "livekit-server-sdk";
import { sendTelegramNotification } from "./telegram";

// Initialize OpenAI client for chat fallback
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerCRMRoutes(app);
  setupRealtime(httpServer);

  // === LIVEKIT ===
  app.get("/api/livekit-token", async (req, res) => {
    try {
      const room = (req.query.room as string) || "default-room";
      const identity = (req.query.identity as string) || `user-${Math.floor(Math.random() * 10000)}`;
      const token = await generateToken(room, identity);

      // --- NEW: Trigger Agent to join this room ---
      try {
        const svc = new AgentDispatchClient(
          process.env.LIVEKIT_URL!,
          process.env.LIVEKIT_API_KEY!,
          process.env.LIVEKIT_API_SECRET!
        );
        
        // This tells LiveKit Cloud to send our 'voice-assistant' agent to this room
        await svc.createDispatch(room, "voice-assistant", {
          metadata: JSON.stringify({ leadName: identity })
        });
        console.log(`[LiveKit] Dispatched agent to room: ${room}`);
      } catch (dispatchError) {
        // We log it but don't fail the token request (the user can still join)
        console.error("[LiveKit] Failed to dispatch agent:", dispatchError);
      }
      // --------------------------------------------

      res.json({ 
        token,
        serverUrl: process.env.LIVEKIT_URL 
      });
    } catch (error: any) {
      console.error("Failed to generate LiveKit token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // === LEADS ===
  app.post("/api/leads", async (req, res) => {
    try {
      const companyId = req.body.companyId || 1;

      // Check limits
      const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (company.limitMinutes) {
        const results = await db.select({
            totalDuration: sql<number>`sum(${calls.duration})`
        })
        .from(calls)
        .innerJoin(leads, eq(calls.leadId, leads.id))
        .where(eq(leads.companyId, companyId));

        const usedMinutes = Math.ceil((Number(results[0]?.totalDuration) || 0) / 60);
        
        if (usedMinutes >= company.limitMinutes) {
            return res.status(403).json({ message: "Извините, сервис временно недоступен. Менеджер свяжется с вами позже." });
        }
      }

      const lead = await storage.createLead(req.body);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Failed to create lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // === CALL LOGS ===
  app.post(api.calls.create.path, async (req, res) => {
    try {
      const call = await storage.createCall(req.body);
      res.status(201).json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to start call" });
    }
  });

  app.post(api.calls.end.path, async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const input = api.calls.end.input.parse(req.body);

      let summary = "Нет данных";

      // Generate AI Summary if transcript exists
      if (input.transcript && input.transcript.length > 0) {
        try {
          console.log("Generating summary for transcript:", input.transcript);
          const summaryResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Fallback to reliable model
            messages: [
              {
                role: "system",
                content: "Summarize this call transcript in Russian (3-6 words) describing the client's interest or main topic. If it was a wrong number/silence, say 'Сброс' or 'Тишина'."
              },
              { role: "user", content: input.transcript }
            ],
            max_tokens: 50,
          });
          summary = summaryResponse.choices[0]?.message?.content || summary;
          console.log("Generated summary:", summary);
        } catch (aiError) {
          console.error("Failed to generate summary:", aiError);
        }
      } else {
        console.log("Transcript too short for summary:", input.transcript);
      }

      const call = await storage.endCall(callId, input.duration, input.transcript, summary);

      // --- Trigger Telegram Notification ---
      try {
        const lead = await storage.getLead(call.leadId);
        if (lead && lead.companyId) {
            const company = await storage.getCompany(lead.companyId);
            if (company) {
                // Do not await, fire and forget so it doesn't block response
                sendTelegramNotification(company, lead, call, input.transcript || "", summary);
            }
        }
      } catch (notifyErr) {
        console.error("Failed to trigger telegram notification:", notifyErr);
      }

      res.json(call);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to end call" });
    }
  });

  // === AI CHAT FOR CALL ===
  app.post(api.calls.chat.path, async (req, res) => {
    try {
      const input = api.calls.chat.input.parse(req.body);

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant in a voice call. Keep your responses concise and conversational, suitable for spoken output. Do not use markdown formatting like bold or lists, as this will be read by text-to-speech."
          },
          { role: "user", content: input.message }
        ],
        max_completion_tokens: 150, // Keep responses short for voice
      });

      const aiText = response.choices[0]?.message?.content || "I couldn't understand that.";
      res.json({ response: aiText });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ response: "Sorry, I'm having trouble connecting." });
    }
  });

  return httpServer;
}
