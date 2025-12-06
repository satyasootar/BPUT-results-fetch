// src/hooks/usePolling.js
import { useEffect, useRef } from "react";

export const usePolling = (callback, interval = 3000, isActive = true) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      // Call immediately on mount
      callback();

      // Set up polling
      intervalRef.current = setInterval(callback, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [callback, interval, isActive]);

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    if (!intervalRef.current) {
      callback();
      intervalRef.current = setInterval(callback, interval);
    }
  };

  return { stop, start };
};
