
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";

// Initialize OpenAI client for chat fallback
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register integration routes
  registerChatRoutes(app);
  registerImageRoutes(app);

  // === CALL LOGS ===
  app.post(api.calls.create.path, async (req, res) => {
    try {
      const call = await storage.createCall({});
      res.status(201).json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to start call" });
    }
  });

  app.post(api.calls.end.path, async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const input = api.calls.end.input.parse(req.body);
      const call = await storage.endCall(callId, input.duration, input.transcript);
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
