import { useState, useCallback } from "react";

export function useLiveKitToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchToken = useCallback(async (room: string, identity: string) => {
    setIsFetching(true);
    try {
      const response = await fetch(`/api/livekit-token?room=${room}&identity=${identity}`);
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error("Failed to fetch LiveKit token:", error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  return { token, fetchToken, isFetching };
}
