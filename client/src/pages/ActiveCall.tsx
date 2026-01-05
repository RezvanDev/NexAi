import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, AlertCircle } from "lucide-react";
import { VoiceVisualizer } from "@/components/VoiceVisualizer";
import { CallControls } from "@/components/CallControls";
import { useEndCall, useChat } from "@/hooks/use-calls";
import { differenceInSeconds } from "date-fns";

interface ActiveCallProps {
  callId: number;
  onEnd: () => void;
}

export default function ActiveCall({ callId, onEnd }: ActiveCallProps) {
  // State
  const [startTime] = useState(new Date());
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Refs for Web APIs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  
  // Mutations
  const endCallMutation = useEndCall();
  const chatMutation = useChat();

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(differenceInSeconds(new Date(), startTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Speech to Text Setup
  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Please use text input.");
      setShowKeyboard(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Listening started");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        setIsUserSpeaking(true);
      } else {
        setIsUserSpeaking(false);
      }

      if (finalTranscript) {
        console.log("Final User Input:", finalTranscript);
        handleUserMessage(finalTranscript);
        setIsUserSpeaking(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please enable permissions.");
      }
    };

    recognition.onend = () => {
      // Auto-restart unless muted or call ended
      if (!isMuted && recognitionRef.current) {
        try {
          // Delay restart to prevent rapid abort/start loops
          setTimeout(() => {
            if (!isMuted && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          // Ignore if already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, []); // Run once on mount

  // Toggle Mute Effect
  useEffect(() => {
    if (recognitionRef.current) {
      if (isMuted) {
        recognitionRef.current.stop();
        setIsUserSpeaking(false);
      } else {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started
        }
      }
    }
  }, [isMuted]);

  // Process User Message
  const handleUserMessage = async (text: string) => {
    // Add to transcript
    setTranscript(prev => [...prev, `You: ${text}`]);
    
    // Stop listening temporarily while AI thinks/speaks (optional, prevents echo)
    // recognitionRef.current?.stop(); 

    try {
      const { response } = await chatMutation.mutateAsync(text);
      setTranscript(prev => [...prev, `AI: ${response}`]);
      speakResponse(response);
    } catch (err) {
      console.error("Chat error", err);
      // Optional: speak error
      speakResponse("I'm having trouble connecting right now.");
    }
  };

  // Text to Speech
  const speakResponse = (text: string) => {
    if (!synthRef.current) return;

    // Cancel current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to pick a better voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => {
      setIsAiSpeaking(false);
      // If not muted, ensure we are listening again
      if (!isMuted && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch(e) {}
      }
    };

    synthRef.current.speak(utterance);
  };

  // Manual Text Input
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleUserMessage(manualInput);
    setManualInput("");
  };

  const handleHangup = async () => {
    // Stop all audio
    synthRef.current.cancel();
    recognitionRef.current?.stop();
    
    // Save call data
    try {
      await endCallMutation.mutateAsync({
        id: callId,
        duration,
        transcript: transcript.join("\n"),
      });
    } catch (err) {
      console.error("Failed to save call", err);
    }
    
    onEnd();
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
          <h3 className="text-white/60 text-sm font-medium tracking-wide">AI AGENT</h3>
          <span className="text-white text-2xl font-display font-semibold">Voice Call</span>
          <span className="text-primary/80 font-mono mt-1">{formatTime(duration)}</span>
        </div>
        
        {/* Error Notification */}
        {error && (
          <div className="absolute top-0 right-0 left-0 bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3 backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-200">{error}</p>
            </div>
            <button onClick={() => setError(null)}><X className="w-4 h-4 text-white/50" /></button>
          </div>
        )}
      </motion.div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <VoiceVisualizer 
          isActive={true} 
          isSpeaking={isAiSpeaking} 
          isListening={isUserSpeaking}
        />

        {/* Live Transcript Snippet */}
        {transcript.length > 0 && !showKeyboard && (
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
      </div>

      {/* Bottom Controls Area */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-6 relative z-20"
      >
        {/* Text Input Overlay */}
        <AnimatePresence>
          {showKeyboard && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleManualSubmit}
              className="flex gap-2 mb-4"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/10 border border-white/10 rounded-full px-6 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button 
                type="submit" 
                className="p-3 bg-primary rounded-full text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
                disabled={!manualInput.trim()}
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex justify-center">
          <CallControls 
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onHangup={handleHangup}
            onToggleKeyboard={() => setShowKeyboard(!showKeyboard)}
            showKeyboard={showKeyboard}
          />
        </div>
      </motion.div>
    </div>
  );
}
