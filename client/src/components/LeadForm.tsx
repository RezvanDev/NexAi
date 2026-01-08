import { useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, ArrowRight } from "lucide-react";

interface LeadFormProps {
    onSubmit: (data: { name: string; phone: string }) => void;
    isSubmitting?: boolean;
}

export function LeadForm({ onSubmit, isSubmitting = false }: LeadFormProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) onSubmit({ name, phone });
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="glass-panel p-6 rounded-2xl w-full max-w-sm space-y-4"
        >
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> Ваше Имя
                </label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-white/20"
                    placeholder="Иван Иванов"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Телефон
                </label>
                <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-white/20"
                    placeholder="+7 (999) 000-00-00"
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Отправка..." : "Начать Звонок"} {isSubmitting ? null : <ArrowRight className="w-4 h-4" />}
            </button>
        </motion.form>
    );
}
