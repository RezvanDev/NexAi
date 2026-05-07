import {
  type JobContext,
  cli,
  defineAgent,
  voice,
  WorkerOptions,
} from '@livekit/agents';
import { realtime } from '@livekit/agents-plugin-openai';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { db } from './db';
import { calls, companies, leads } from '../shared/schema';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);

// Define the entrypoint for the agent
export default defineAgent({
  entry: async (ctx: JobContext) => {
    const roomName = ctx.job.room?.name || "unknown";
    console.log(`[Agent] Starting job in room: ${roomName}`);
    
    // 1. Fetch Company Settings and Lead Info
    let instructions = "You are a helpful AI Voice Assistant.";
    let leadName = "клиент";
    let callId: number | null = null;
    let agentVoice: any = 'alloy';

    try {
      // Extract lead name from metadata (sent from server/routes.ts)
      const metadata = JSON.parse(ctx.job.metadata || "{}");
      if (metadata.leadName) leadName = metadata.leadName;

      const parsedId = parseInt(roomName.replace('call-', ''));
      if (!isNaN(parsedId)) {
        callId = parsedId;
        const [callData] = await db
          .select({
            company: companies,
          })
          .from(calls)
          .innerJoin(leads, eq(calls.leadId, leads.id))
          .leftJoin(companies, eq(leads.companyId, companies.id))
          .where(eq(calls.id, callId));

        let company = callData?.company;

        // Fallback: if lead has no company, use the first/last created company for testing
        if (!company) {
          const [lastCompany] = await db.select().from(companies).limit(1);
          company = lastCompany;
        }

        if (company) {
          agentVoice = company.voice || 'alloy';
          instructions = `
            ${company.systemPrompt}
            
            КОНТЕКСТ:
            - Название компании: ${company.name}
            - Роль агента: ${company.agentRole}
            - Имя агента: ${company.agentName}
            - Доп. информация: ${company.companyContext || "Нет"}
            
            ДАННЫЕ ТЕКУЩЕГО ЗВОНКА:
            - Имя собеседника (клиента): ${leadName}
            
            ИНСТРУКЦИИ:
            - Приветствие: ${company.agentGreeting}
            - Если клиент прощается, скажи: ${company.agentTerminationPhrase}
            - Обязательно обращайся к клиенту по имени, если это уместно.
          `.trim();
          console.log(`[Agent] [Call ${callId}] Configured for ${company.name}, Lead: ${leadName}`);
        }
      }
    } catch (error) {
      console.error(`[Agent] [Call ${callId}] Setup error:`, error);
    }

    await ctx.connect();
    console.log(`[Agent] [Call ${callId}] Connected to room: ${roomName}`);

    // Create the agent configuration with DYNAMIC, ISOLATED instructions
    const agent = new voice.Agent({
      instructions,
      llm: new realtime.RealtimeModel({
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        voice: agentVoice
      }),
    });

    // Create and start the agent session
    const session = new voice.AgentSession({ agent });

    // Track transcript to console
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      const text = ev.alternatives?.[0]?.text || '';
      if (text) console.log(`[User]: ${text}`);
    });

    // START SESSION
    await session.start({ room: ctx.room, agent });
    console.log(`[Agent] Voice assistant session started`);

    // Save transcript when session ends
    session.on(voice.AgentSessionEventTypes.Close, async () => {
      if (callId) {
        try {
          // Use session.history to access all messages
          const messages = session.history.allMessages || [];
          
          if (messages.length > 0) {
            const transcript = messages
              .map(m => {
                const role = m.role || 'unknown';
                const content = m.content || '';
                return `${role}: ${content}`;
              })
              .join('\n');
            
            await db.update(calls)
              .set({ 
                transcript,
                endedAt: new Date(),
                status: 'completed'
              })
              .where(eq(calls.id, callId));
            console.log(`[Agent] Saved transcript for call ${callId} (${messages.length} messages)`);
          }
        } catch (saveError) {
          console.error("[Agent] Failed to save transcript:", saveError);
        }
      }
    });
  },
});

// Start the worker if this file is run directly
if (process.argv[1] === __filename || process.argv[1].endsWith('agent.ts')) {
  cli.runApp(new WorkerOptions({
    agent: __filename,
    agentName: 'voice-assistant',
  }));
}
