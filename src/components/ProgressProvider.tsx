"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProgressState } from "@/lib/progress-service";

type ProgressContextValue = {
  states: ProgressState[];
  error: string;
  loading: boolean;
  declareMastery: (knowledgePointId: string) => Promise<void>;
  completeLearning: (knowledgePointId: string) => Promise<void>;
  reload: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

async function readJson(response: Response) {
  return (await response.json()) as {
    states?: ProgressState[];
    state?: ProgressState;
    error?: string;
  };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<ProgressState[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/progress", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data.error ?? "暂时无法读取学习进度。");
      }
      setStates(data.states ?? []);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法读取学习进度。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/progress", { cache: "no-store" });
        const data = await readJson(response);
        if (!response.ok) {
          throw new Error(data.error ?? "暂时无法读取学习进度。");
        }
        if (active) {
          setStates(data.states ?? []);
          setError("");
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "暂时无法读取学习进度。",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const declareMastery = useCallback(async (knowledgePointId: string) => {
    const response = await fetch("/api/progress/mastery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledgePointId }),
    });
    const data = await readJson(response);
    if (!response.ok || !data.state) {
      throw new Error(data.error ?? "暂时无法保存掌握状态。");
    }
    setStates((current) => [
      ...current.filter(
        (state) => state.knowledgePointId !== data.state?.knowledgePointId,
      ),
      data.state as ProgressState,
    ]);
    setError("");
  }, []);

  const completeLearning = useCallback(async (knowledgePointId: string) => {
    const response = await fetch("/api/progress/learning", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledgePointId }),
    });
    const data = await readJson(response);
    if (!response.ok || !data.state) {
      throw new Error(data.error ?? "暂时无法保存重新学习状态。");
    }
    setStates((current) => [
      ...current.filter(
        (state) => state.knowledgePointId !== data.state?.knowledgePointId,
      ),
      data.state as ProgressState,
    ]);
    setError("");
  }, []);

  const value = useMemo(
    () => ({
      states,
      error,
      loading,
      declareMastery,
      completeLearning,
      reload,
    }),
    [states, error, loading, declareMastery, completeLearning, reload],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useKnowledgeProgress() {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error("useKnowledgeProgress 必须在 ProgressProvider 中使用。");
  }
  return value;
}
