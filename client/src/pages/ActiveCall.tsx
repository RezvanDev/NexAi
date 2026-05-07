import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff } from "lucide-react";
import { VoiceVisualizer } from "@/components/VoiceVisualizer";
import { differenceInSeconds } from "date-fns";
import { useLiveKitToken } from "@/hooks/use-livekit";
import { useToast } from "@/hooks/use-toast";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant,
  useRoomContext
} from "@livekit/components-react";
import { RoomEvent, type TranscriptionSegment, type Participant } from "livekit-client";
import "@livekit/components-styles";

interface ActiveCallProps {
  callId: number;
  leadName: string;
  onEnd: (data: { duration: number; transcript: string }) => void;
}

export default function ActiveCall({ callId, leadName, onEnd }: ActiveCallProps) {
  const [startTime] = useState(new Date());
  const [duration, setDuration] = useState(0);
  const [transcriptText, setTranscriptText] = useState("");
  const { token, serverUrl, fetchToken } = useLiveKitToken();
  const { toast } = useToast();
  const hasEndedRef = useRef(false);

  const roomName = useMemo(() => `call-${callId}`, [callId]);
  const identity = useMemo(() => leadName || `user-${callId}`, [leadName, callId]);

  // Fetch token on mount
  useEffect(() => {
    fetchToken(roomName, identity);
  }, [fetchToken, roomName, identity]);

  // Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(differenceInSeconds(new Date(), startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleHangup = () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    onEnd({ duration, transcript: transcriptText || "Звонок завершен. Данных нет." });
  };

  // Max duration effect
  useEffect(() => {
    if (duration >= 100 && !hasEndedRef.current) {
      hasEndedRef.current = true;
      toast({
        title: "Время звонка вышло ⏱",
        description: "Спасибо за обращение, менеджер скоро свяжется с вами!",
        duration: 5000,
      });
      
      // Give them a moment to read the toast before hanging up
      setTimeout(() => {
        onEnd({ duration, transcript: transcriptText || "Звонок завершен по лимиту времени." });
      }, 3000);
    }
  }, [duration, toast, onEnd, transcriptText]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
            <span className="text-white/60">Инициализация соединения...</span>
         </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={handleHangup}
      className="min-h-screen bg-[#050505] flex flex-col items-center justify-between p-6 relative overflow-hidden"
    >
      <CallContent 
        duration={duration} 
        formatTime={formatTime} 
        handleHangup={handleHangup}
        setTranscriptText={setTranscriptText}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function CallContent({ duration, formatTime, handleHangup, setTranscriptText }: any) {
  const { state } = useVoiceAssistant();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";

  const [messages, setMessages] = useState<{id: string, name: string, text: string, isFinal: boolean}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room) return;

    const handleTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      setMessages(prev => {
        const newMessages = [...prev];
        for (const segment of segments) {
          const index = newMessages.findIndex(m => m.id === segment.id);
          const name = participant?.identity === room.localParticipant.identity ? "Вы" : "AI";
          if (index >= 0) {
            newMessages[index] = { ...newMessages[index], text: segment.text, isFinal: segment.final };
          } else {
            newMessages.push({ id: segment.id, name, text: segment.text, isFinal: segment.final });
          }
        }
        return newMessages;
      });
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    const finalTranscript = messages
      .filter(m => m.isFinal)
      .map(m => `${m.name}: ${m.text}`)
      .join("\n");
    setTranscriptText(finalTranscript);
  }, [messages, setTranscriptText]);

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  return (
    <>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header Info */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-md flex justify-between items-start"
      >
        <div className="flex flex-col">
          <h3 className="text-white/60 text-sm font-medium tracking-wide">AI АГЕНТ (WebRTC)</h3>
          <span className="text-white text-2xl font-display font-semibold">Голосовой Ассистент</span>
          <span className="text-primary/80 font-mono mt-1">{formatTime(duration)}</span>
        </div>

        {state === "connecting" && (
          <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full">
            <span className="animate-pulse w-2 h-2 rounded-full bg-current" />
            <span className="text-xs">Соединение...</span>
          </div>
        )}
      </motion.div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <VoiceVisualizer
          isActive={true}
          isSpeaking={isSpeaking}
          isListening={isListening}
        />
      </div>

      {/* Subtitles Area */}
      <div 
        ref={scrollRef}
        className="w-full max-w-md h-40 overflow-y-auto mb-4 space-y-3 px-4 pb-4 custom-scrollbar"
        style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}
      >
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.name === "Вы" ? "items-end" : "items-start"}`}>
             <span className="text-xs text-white/40 mb-1">{m.name}</span>
             <p className={`text-sm p-3 rounded-2xl max-w-[85%] ${m.name === "Вы" ? "bg-primary/20 text-white rounded-br-none" : "bg-white/10 text-white/90 rounded-bl-none"} ${!m.isFinal && "opacity-70 italic"}`}>
               {m.text}
             </p>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-white/30 text-sm italic pt-10">
            Ожидание речи...
          </div>
        )}
      </div>

      {/* Bottom Controls Area */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-6 relative z-20"
      >
        <div className="flex justify-center gap-6">
          <button
            onClick={toggleMic}
            className={`p-5 rounded-full transition-all shadow-xl ${!isMicrophoneEnabled ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isMicrophoneEnabled ? "Выключить микрофон" : "Включить микрофон"}
          >
            {!isMicrophoneEnabled ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={handleHangup}
            className="p-5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-2xl shadow-red-600/40"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
