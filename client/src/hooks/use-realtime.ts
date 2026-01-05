import { useEffect, useRef, useState, useCallback } from "react";
import { floatTo16BitPCM, arrayBufferToBase64, base64ToUint8Array } from "@/lib/audio";

export function useRealtime(onCallEnd?: () => void) {
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // AI is speaking
    const [isListening, setIsListening] = useState(false); // User is speaking (VAD)
    const [transcript, setTranscript] = useState<string[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const audioQueueRef = useRef<Uint8Array[]>([]);
    const isPlayingRef = useRef(false);
    const nextStartTimeRef = useRef(0);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const shouldEndRef = useRef(false);
    const canStreamRef = useRef(false);

    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        // 1. Setup Audio Context (24kHz for OpenAI Realtime)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000,
        });
        audioContextRef.current = audioContext;
        // Resume now to clear suspended state
        await audioContext.resume();

        // 2. Connect WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/realtime`);
        wsRef.current = ws;

        ws.onopen = async () => {
            console.log("Connected to Realtime Server");
            setIsConnected(true);

            // Audio Warmup: Mute mic for first 5 seconds to prevent greeting interruption
            setTimeout(() => {
                console.log("Mic activated after warmup");
                canStreamRef.current = true;
            }, 5000);

            // Start Microphone
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        channelCount: 1,
                        echoCancellation: true,
                        autoGainControl: true,
                        noiseSuppression: true,
                    }
                });
                streamRef.current = stream;
                const source = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);

                processor.onaudioprocess = (e) => {
                    if (!canStreamRef.current) return; // Mute logic

                    const inputData = e.inputBuffer.getChannelData(0);

                    // Convert to PCM16
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64 = arrayBufferToBase64(pcm16);

                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "input_audio_buffer.append",
                            audio: base64
                        }));
                    }
                };


                source.connect(processor);
                processor.connect(audioContext.destination); // destination is mute for script processor usually? Check this.
                // Actually ScriptProcessor needs to be connected to destination to work, but we don't want to hear ourselves. 
                // In Chrome it works if connected.

                processorRef.current = processor;
            } catch (err) {
                console.error("Microphone error:", err);
            }
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log("RX:", data.type);

            switch (data.type) {
                case "response.audio.delta":
                    const audioData = base64ToUint8Array(data.delta);
                    queueAudio(audioData);
                    break;
                case "response.audio_transcript.delta":
                    // Optional: realtime subtitles
                    break;
                case "response.done":
                    // console.log("Response Done:", JSON.stringify(data.response, null, 2));
                    setTranscript(prev => [...prev, `AI: ${data.transcript}`]);
                    break;
                case "input_audio_buffer.speech_started":
                    setIsListening(true);
                    clearAudioQueue(); // Interrupt AI
                    break;
                case "input_audio_buffer.speech_stopped":
                    setIsListening(false);
                    break;
                case "conversation.item.input_audio_transcription.completed":
                    setTranscript(prev => [...prev, `You: ${data.transcript}`]);
                    break;
                case "call.end.request": // Custom server event
                case "call.end": // Legacy support
                    console.log("Received end call request. Will disconnect after audio.");
                    shouldEndRef.current = true;
                    // If immediate end needed (no audio playing)
                    if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
                        console.log("No audio playing, ending immediately.");
                        if (onCallEnd) onCallEnd();
                    }
                    break;
            }
        };

        ws.onclose = () => {
            console.log("WebSocket closed by server/network.");
            setIsConnected(false);
            disconnect();
        };

    }, []);

    // Helper to queue audio
    const queueAudio = (data: Uint8Array) => {
        audioQueueRef.current.push(data);
        if (!isPlayingRef.current) {
            playNextChunk();
        }
    };

    const clearAudioQueue = () => {
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        setIsSpeaking(false);

        // Immediate stop
        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            currentSourceRef.current = null;
        }
    };

    const playNextChunk = async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            if (shouldEndRef.current) {
                console.log("Audio queue drained. Ending call now.");
                if (onCallEnd) onCallEnd();
            }
            return;
        }

        isPlayingRef.current = true;
        setIsSpeaking(true);

        const chunk = audioQueueRef.current.shift()!;
        if (!audioContextRef.current) return;

        const ctx = audioContextRef.current;
        // PCM16 -> AudioBuffer
        // Warning: This decoding is raw. `decodeAudioData` usually expects headers (WAV/MP3).
        // Since we have raw PCM16, we need to manually create standard AudioBuffer.

        const float32 = new Float32Array(chunk.length / 2);
        const view = new DataView(chunk.buffer);
        for (let i = 0; i < chunk.length / 2; i++) {
            const int16 = view.getInt16(i * 2, true);
            float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7FFF;
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        currentSourceRef.current = source;

        // Schedule seamless playback
        const currentTime = ctx.currentTime;
        const start = Math.max(currentTime, nextStartTimeRef.current);
        source.start(start);
        nextStartTimeRef.current = start + audioBuffer.duration;

        source.onended = () => {
            // This triggers when THIS chunk ends. 
            // Recursive play is better handled by just scheduling ahead.
            // But here we are just pushing chunks.
        };

        // Loop
        playNextChunk();
    };

    const disconnect = useCallback(() => {
        if (wsRef.current) wsRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (processorRef.current) processorRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();

        wsRef.current = null;
        streamRef.current = null;
        processorRef.current = null;
        audioContextRef.current = null;
        setIsConnected(false);
    }, []);

    return {
        connect,
        disconnect,
        isConnected,
        isSpeaking,
        isListening,
        transcript
    };
}
