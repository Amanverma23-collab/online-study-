"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ACTIVE_BATCH_KEY, type SingleBatch, SINGLE_BATCHES } from "@/lib/batch";

interface ActiveBatchContextType {
  activeBatch: SingleBatch | null;
  setActiveBatch: (batch: SingleBatch | null) => void;
}

const ActiveBatchContext = createContext<ActiveBatchContextType>({
  activeBatch: null,
  setActiveBatch: () => {},
});

export function ActiveBatchProvider({ children }: { children: React.ReactNode }) {
  const [activeBatch, setActiveBatchState] = useState<SingleBatch | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_BATCH_KEY);
    if (saved && (SINGLE_BATCHES as readonly string[]).includes(saved)) {
      setActiveBatchState(saved as SingleBatch);
    } else {
      setActiveBatchState(null);
    }
  }, []);

  const setActiveBatch = (batch: SingleBatch | null) => {
    setActiveBatchState(batch);
    if (batch) {
      localStorage.setItem(ACTIVE_BATCH_KEY, batch);
    } else {
      localStorage.removeItem(ACTIVE_BATCH_KEY);
    }
  };

  return (
    <ActiveBatchContext.Provider value={{ activeBatch, setActiveBatch }}>
      {children}
    </ActiveBatchContext.Provider>
  );
}

export const useActiveBatch = () => useContext(ActiveBatchContext);
