import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, AlertCircle } from "lucide-react";
import { VoiceVisualizer } from "@/components/VoiceVisualizer";
import { CallControls } from "@/components/CallControls";
import { differenceInSeconds } from "date-fns";
import { useRealtime } from "@/hooks/use-realtime";

interface ActiveCallProps {
  callId: number;
  leadName: string;
  onEnd: (data: { duration: number; transcript: string }) => void;
}

export default function ActiveCall({ callId, leadName, onEnd }: ActiveCallProps) {
  const [startTime] = useState(new Date());
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const handleEndWrapper = (passedTranscript?: string[]) => {
    // Prefer passed transcript from hook (synchronous ref) over component state (async)
    const transcriptToUse = passedTranscript || transcript;
    const finalTranscript = transcriptToUse.join("\n").replace(/^AI: /gm, "AI: ").replace(/^You: /gm, "Client: ");
    onEnd({ duration, transcript: finalTranscript });
  };

  const { connect, disconnect, isConnected, isSpeaking, isListening, transcript } = useRealtime(handleEndWrapper, leadName);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(differenceInSeconds(new Date(), startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleHangup = () => {
    disconnect();
    handleEndWrapper();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-between p-6 relative overflow-hidden">

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header Info */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-md flex justify-between items-start"
      >
        <div className="flex flex-col">
          <h3 className="text-white/60 text-sm font-medium tracking-wide">AI АГЕНТ</h3>
          <span className="text-white text-2xl font-display font-semibold">Голосовой Агент</span>
          <span className="text-primary/80 font-mono mt-1">{formatTime(duration)}</span>
        </div>

        {!isConnected && (
          <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full">
            <span className="animate-pulse w-2 h-2 rounded-full bg-current" />
            <span className="text-xs">Подключение...</span>
          </div>
        )}
      </motion.div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <VoiceVisualizer
          isActive={isConnected}
          isSpeaking={isSpeaking}
          isListening={isListening}
        />

        {/* Live Transcript Snippet - REMOVED per user request
        {transcript.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-10 left-0 right-0 mx-auto max-w-sm text-center px-4"
          >
            <p className="text-white/70 text-lg font-medium leading-relaxed glass-panel p-4 rounded-xl border-none bg-black/20">
              "{transcript[transcript.length - 1].replace(/^(You|AI): /, '')}"
            </p>
          </motion.div>
        )}
        */}
      </div>

      {/* Bottom Controls Area */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-6 relative z-20"
      >
        {/* Controls */}
        <div className="flex justify-center gap-4">
          {/* Simplified Controls for Realtime */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={handleHangup}
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
