
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";
import { setupRealtime } from "./realtime";
import { registerCRMRoutes } from "../crm/server/routes";

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

  // === LEADS ===
  app.post("/api/leads", async (req, res) => {
    try {
      const lead = await storage.createLead(req.body);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Failed to create lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // === COMPANIES ===
  app.post("/api/companies", async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (error) {
      console.error("Failed to create company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[PATCH] Updating company ${id}. Payload:`, JSON.stringify(req.body, null, 2));
      const company = await storage.updateCompany(id, req.body);
      console.log(`[PATCH] Updated company result:`, JSON.stringify(company, null, 2));
      res.json(company);
    } catch (error) {
      console.error("Failed to update company:", error);
      res.status(500).json({ message: "Failed to update company" });
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
