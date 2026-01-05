import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean; // Is the AI speaking?
  isListening: boolean; // Is the User speaking?
}

export function VoiceVisualizer({ isActive, isSpeaking, isListening }: VoiceVisualizerProps) {
  // Base circle variants
  const circleVariants = {
    idle: {
      scale: 1,
      opacity: 0.3,
      transition: { duration: 0.5 }
    },
    active: {
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut"
      }
    },
    speaking: {
      scale: [1, 1.5, 1.2, 1.6, 1],
      opacity: [0.4, 0.8, 0.6, 0.9, 0.4],
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut"
      }
    },
    listening: {
      scale: [1, 1.1, 1],
      borderColor: ["rgba(139, 92, 246, 0.2)", "rgba(139, 92, 246, 0.8)", "rgba(139, 92, 246, 0.2)"],
      transition: {
        repeat: Infinity,
        duration: 0.8,
        ease: "linear"
      }
    }
  };

  const state = isSpeaking ? "speaking" : isListening ? "listening" : isActive ? "active" : "idle";

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer Glow Rings */}
      <motion.div
        variants={circleVariants}
        animate={state}
        className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
      />
      
      {/* Middle Ring */}
      <motion.div
        variants={circleVariants}
        animate={state}
        transition={{ delay: 0.1 }}
        className="absolute inset-4 rounded-full border-2 border-primary/30"
      />

      {/* Core Circle */}
      <motion.div
        animate={state === "speaking" ? {
          scale: [1, 1.2, 1],
          backgroundColor: ["#7c3aed", "#a78bfa", "#7c3aed"],
        } : {
          scale: 1,
          backgroundColor: "#4c1d95"
        }}
        transition={{ repeat: Infinity, duration: state === "speaking" ? 0.5 : 2 }}
        className="relative z-10 w-32 h-32 rounded-full bg-primary shadow-[0_0_40px_rgba(124,58,237,0.5)] flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 to-accent/50" />
        
        {/* Icon or Graphic inside */}
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-white z-20 opacity-90"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </motion.div>

      {/* Status Text */}
      <div className="absolute -bottom-12 text-center w-full">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={state}
          className="text-lg font-medium text-primary-foreground/80 tracking-widest uppercase text-xs"
        >
          {isSpeaking ? "AI Speaking..." : isListening ? "Listening..." : "Connected"}
        </motion.p>
      </div>
    </div>
  );
}
