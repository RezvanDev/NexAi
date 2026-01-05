import { Mic, MicOff, PhoneOff, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onHangup: () => void;
  onToggleKeyboard: () => void;
  showKeyboard: boolean;
}

export function CallControls({ 
  isMuted, 
  onToggleMute, 
  onHangup, 
  onToggleKeyboard,
  showKeyboard 
}: CallControlsProps) {
  return (
    <div className="flex items-center gap-6 p-6 rounded-3xl glass-panel">
      <button
        onClick={onToggleMute}
        className={cn(
          "p-4 rounded-full transition-all duration-200 shadow-lg",
          isMuted 
            ? "bg-white text-black hover:bg-gray-200" 
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      <button
        onClick={onHangup}
        className="p-6 rounded-full bg-red-500 text-white shadow-xl shadow-red-500/30 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <PhoneOff className="w-8 h-8" />
      </button>

      <button
        onClick={onToggleKeyboard}
        className={cn(
          "p-4 rounded-full transition-all duration-200 shadow-lg",
          showKeyboard
            ? "bg-primary text-white hover:bg-primary/90" 
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        <Keyboard className="w-6 h-6" />
      </button>
    </div>
  );
}
