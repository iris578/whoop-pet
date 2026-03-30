import { useState, useEffect, useCallback } from "react";
import type { CreatureDisplay } from "../../shared/types.js";

type Status = "loading" | "ready" | "error";

export function useCreature() {
  const [display, setDisplay] = useState<CreatureDisplay | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [isDemo, setIsDemo] = useState(true);

  const fetchCreature = useCallback(async () => {
    try {
      setStatus("loading");
      const res = await fetch("/api/creature", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDisplay(data);
      setIsDemo(data.is_demo ?? true);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setStatus("loading");
      const res = await fetch("/api/creature/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to refresh");
      const data = await res.json();
      setDisplay(data);
      setIsDemo(data.is_demo ?? true);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchCreature();
  }, [fetchCreature]);

  return { display, status, isDemo, refresh, fetchCreature };
}
