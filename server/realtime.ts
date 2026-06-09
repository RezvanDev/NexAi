import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { log } from "./index";
import { db } from "./db";
import { companies } from "../shared/schema";
import { eq } from "drizzle-orm";

export function setupRealtime(server: Server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request: IncomingMessage, socket, head) => {
        if (request.url?.startsWith("/realtime")) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        }
    });

    wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
        log("Client connected to /realtime", "websocket");

        const openai = new WebSocket(
            "wss://api.openai.com/v1/realtime?model=gpt-realtime-mini",
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "OpenAI-Beta": "realtime=v1",
                },
            }
        );

        const initializeSession = async (req: IncomingMessage) => {
            // Parse query params to get leadName
            const url = new URL(req.url || "", `http://${req.headers.host}`);

            // Fetch Company Settings (For now, default to ID 1)
            // In a real multi-tenant app, we would get companyId from the URL or domain
            const companyId = 1;
            const company = await db.query.companies.findFirst({
                where: eq(companies.id, companyId)
            });

            const agentName = company?.agentName || "AI Assistant";
            const companyContext = company?.companyContext || "You are a helpful assistant.";
            const agentRole = company?.agentRole || "Representative";
            const agentGreeting = company?.agentGreeting || "Здравствуйте! Чем могу помочь?";
            const agentTerminationPhrase = company?.agentTerminationPhrase || "Хорошо, менеджер свяжется с вами в ближайшее время. Всего доброго.";

            console.log(`Client connected. Agent: ${agentName} (${agentRole})`);

            const instructions = `You are ${agentName}, a ${agentRole} for "${company?.name || 'our company'}".
    
    YOUR KNOWLEDGE BASE / CONTEXT:
    ${companyContext}
    
    - Be concise, friendly, and professional.
    - If you don't know an answer, say you will check with a human specialist.
    - If the user asks to speak to a manager, say "${agentTerminationPhrase}" and then IMMEDIATELY call the "endCall" tool.
    - Speak Russian or English, depending on user preference, but start in Russian.
    `;

            const sessionUpdate = {
                type: "session.update",
                session: {
                    modalities: ["text", "audio"],
                    instructions: instructions,
                    voice: "alloy",
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500
                    },
                    tools: [
                        {
                            type: "function",
                            name: "endCall",
                            description: "Ends the current call. Use this when the user says goodbye, asks to end the call, or when you have finished handling their request (e.g. promised a manager callback).",
                            parameters: {
                                type: "object",
                                properties: {},
                            },
                        },
                    ],
                }
            };

            // Force the model to generate the first response (greeting) immediately
            const initialGreeting = {
                type: "response.create",
                response: {
                    modalities: ["text", "audio"],
                    instructions: agentGreeting,
                },
            };

            openai.send(JSON.stringify(sessionUpdate));
            openai.send(JSON.stringify(initialGreeting));
        };

        // Relay: OpenAI -> Client
        openai.on("open", () => {
            log("Connected to OpenAI Realtime API", "openai");
            initializeSession(request);
        });

        openai.on("message", (data) => {
            try {
                const response = JSON.parse(data.toString());
                // console.log("OpenAI Event:", response.type);

                // Handle Function Calling (End Call)
                if (
                    (response.type === "response.function_call_arguments.done" && response.name === "endCall") ||
                    (response.type === "response.output_item.done" && response.item?.type === "function_call" && response.item?.name === "endCall")
                ) {
                    console.log("AI requested to end call. Sending termination signal...");

                    // Signal the client to hang up AFTER a delay to ensure audio plays
                    setTimeout(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: "call.end.request" }));
                        }
                    }, 4000);

                    // Delay server closure even more
                    setTimeout(() => {
                        if (ws.readyState === WebSocket.OPEN) ws.close();
                    }, 8000);
                }

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data.toString());
                }
            } catch (e) {
                console.error("Error parsing OpenAI message", e);
            }
        });

        openai.on("error", (error) => {
            console.error("OpenAI Error:", error);
            log(`OpenAI Error: ${error.message}`, "openai");
        });

        openai.on("close", () => {
            log("Disconnected from OpenAI", "openai");
            if (ws.readyState === WebSocket.OPEN) ws.close();
        });

        // Relay: Client -> OpenAI
        ws.on("message", (data) => {
            try {
                const event = JSON.parse(data.toString());
                // console.log("Client Event:", event.type);
                if (openai.readyState === WebSocket.OPEN) {
                    openai.send(data.toString());
                }
            } catch (e) {
                console.error("Error parsing client message", e);
            }
        });

        ws.on("close", () => {
            log("Client disconnected", "websocket");
            if (openai.readyState === WebSocket.OPEN) openai.close();
        });
    });
}
