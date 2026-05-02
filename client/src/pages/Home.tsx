import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, History, MoreVertical, Sparkles } from "lucide-react";
import { useStartCall, useCreateLead, useEndCall } from "@/hooks/use-calls";
import { useToast } from "@/hooks/use-toast";
import ActiveCall from "./ActiveCall";
import { LeadForm } from "@/components/LeadForm";

export default function Home() {
  const [isInCall, setIsInCall] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [callId, setCallId] = useState<number | null>(null);
  const [leadName, setLeadName] = useState("");

  const startCallMutation = useStartCall();
  const createLeadMutation = useCreateLead();
  const endCallMutation = useEndCall();
  const [, setLocation] = useLocation();

  const { toast } = useToast();

  const handleLeadSubmit = async (data: { name: string; phone: string }) => {
    try {
      setLeadName(data.name);

      // Extract companyId from URL
      const searchParams = new URLSearchParams(window.location.search);
      const companyId = searchParams.get('companyId') ? parseInt(searchParams.get('companyId')!) : null;

      // 1. Create Lead (with companyId)
      const lead = await createLeadMutation.mutateAsync({ 
        ...data,
        companyId: companyId 
      });

      // 2. Start Call (pass leadId)
      const call = await startCallMutation.mutateAsync({ leadId: lead.id });
      setCallId(call.id);
      setIsInCall(true);
      setShowLeadForm(false);
    } catch (error: any) {
      console.error("Failed to start sequence", error);
      
      const errorMessage = error?.message || "Не удалось начать звонок";
      toast({
        title: "Ожидание оператора",
        description: errorMessage.includes("временно недоступен") ? errorMessage : "К сожалению, сейчас все линии заняты. Попробуйте позже.",
        variant: "destructive"
      });
    }
  };

  const handleEndCall = async (data: { duration: number; transcript: string }) => {
    if (callId) {
      try {
        await endCallMutation.mutateAsync({
          id: callId,
          duration: data.duration,
          transcript: data.transcript
        });
        console.log("Call saved successfully");
      } catch (e) {
        console.error("Failed to save call", e);
      }
    }
    setIsInCall(false);
    setCallId(null);
    setLeadName("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0e] to-black text-foreground overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] opacity-30 animate-pulse delay-1000" />
      </div>

      <AnimatePresence mode="wait">
        {isInCall && callId ? (
          <motion.div
            key="active-call"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-50"
          >
            <ActiveCall callId={callId} leadName={leadName} onEnd={handleEndCall} />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 max-w-md mx-auto h-screen flex flex-col p-6"
          >
            {/* Header */}
            <header className="flex items-center justify-between py-4 mb-8">
              <div>
                <h1 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  AI Голосовой Агент
                </h1>
                <p className="text-sm text-muted-foreground">Всегда готов к общению</p>
              </div>
              <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center space-y-12">

              {!showLeadForm ? (
                <>
                  {/* Status Card */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center space-y-2"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      Система Онлайн
                    </div>
                    <h2 className="text-4xl font-display font-bold tracking-tight">
                      Привет, <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Гость</span>
                    </h2>
                    <p className="text-muted-foreground max-w-[260px] mx-auto">
                      Нажми кнопку ниже, чтобы начать безопасный голосовой чат с AI ассистентом.
                    </p>
                  </motion.div>

                  {/* Call Button Container */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-20 group-hover:opacity-40 animate-pulse transition-opacity duration-700" />

                    <button
                      onClick={() => setShowLeadForm(true)}
                      className="relative w-32 h-32 rounded-full bg-gradient-to-b from-primary to-primary/80 flex items-center justify-center shadow-[0_0_50px_rgba(124,58,237,0.4)] border-4 border-white/5 group-hover:scale-105 group-active:scale-95 transition-all duration-300"
                    >
                      <Phone className="w-12 h-12 text-white fill-current" />
                    </button>
                  </div>
                </>
              ) : (
                <LeadForm onSubmit={handleLeadSubmit} isSubmitting={createLeadMutation.isPending || startCallMutation.isPending} />
              )}

            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-xs text-muted-foreground/50">
              <p>Работает на OpenAI & WebRTC</p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
