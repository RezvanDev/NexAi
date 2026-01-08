import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// ============================================
// HOOKS FOR CALLS API
// ============================================

export function useStartCall() {
  return useMutation({
    mutationFn: async (data?: { leadId?: number }) => {
      const res = await fetch(api.calls.create.path, {
        method: api.calls.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start call");
      return api.calls.create.responses[201].parse(await res.json());
    },
  });
}

export function useEndCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, duration, transcript }: { id: number; duration: number; transcript?: string }) => {
      const url = buildUrl(api.calls.end.path, { id });
      const res = await fetch(url, {
        method: api.calls.end.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration, transcript }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to end call");
      return api.calls.end.responses[200].parse(await res.json());
    },
  });
}

export function useChat() {
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(api.calls.chat.path, {
        method: api.calls.chat.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Chat failed");
      return api.calls.chat.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLead() {
  return useMutation({
    mutationFn: async (data: { name: string; phone: string; email?: string; companyId?: number }) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create lead");
      return await res.json();
    }
  });
}
