import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { log } from "./index";

export function setupRealtime(server: Server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request: IncomingMessage, socket, head) => {
        if (request.url === "/realtime") {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        }
    });

    wss.on("connection", (ws: WebSocket) => {
        log("Client connected to /realtime", "websocket");

        const openai = new WebSocket(
            "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "OpenAI-Beta": "realtime=v1",
                },
            }
        );

        const initializeSession = () => {
            const sessionUpdate = {
                type: "session.update",
                session: {
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.6, // Higher threshold to reduce noise triggers
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500
                    },
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    voice: "alloy",
                    instructions: `You are an AI representative of "NexPride", a software development studio. 
                    - Your goal is to answer client questions about services (web/mobile development, AI integration) and pricing.
                    - Start the conversation with: "Вы позвонили в компанию NexPride, чем могу помочь?" (Say this immediately upon connection).
                    - If the user asks for a price, say that pricing depends on the project scope but you can send a catalog or discuss details. mention that you have various packages.
                    - If the user EXPLICITLY asks to speak to an operator, manager, or human:
                        1. Say exactly: "Вам перезвонит менеджер, всего доброго."
                        2. IMMEDIATELY call the "endCall" tool to hang up.
                    - If the audio is unclear or empty, DO NOT say the manager line. Just ask the user to repeat.
                    - Be professional, concise, and helpful. 
                    - Speak Russian.`,
                    modalities: ["text", "audio"],
                    temperature: 0.7,
                    tools: [
                        {
                            type: "function",
                            name: "endCall",
                            description: "Ends the call immediately. Use this AFTER saying the goodbye phrase when transferring to a manager.",
                            parameters: { type: "object", properties: {} }
                        }
                    ],
                },
            };

            console.log("Sending session update:", JSON.stringify(sessionUpdate));
            openai.send(JSON.stringify(sessionUpdate));

            // Force the model to generate the first response (greeting) immediately
            const initialGreeting = {
                type: "response.create",
                response: {
                    modalities: ["text", "audio"],
                    instructions: "Say the greeting: 'Вы позвонили в компанию NexPride, чем могу помочь?'",
                },
            };
            openai.send(JSON.stringify(initialGreeting));
        };

        // Relay: OpenAI -> Client
        openai.on("open", () => {
            log("Connected to OpenAI Realtime API", "openai");
            initializeSession();
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
                    // We use 'call.end.request' so client can finish playing audio queue
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
