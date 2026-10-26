"use client";
import { useEffect, useState } from "react";
import { ConversationReadUnavailable } from "../../../../shared/meri-conversations/current-reads";

/** Private current-read material exists only for this mounted selection and request generation. */
export function useCurrentRead<T>(
  key: string,
  read: (signal: AbortSignal) => Promise<T>,
) {
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    generation: number;
    value?: T;
    error?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    void read(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setResult({ key, generation, value });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            generation,
            error:
              error instanceof ConversationReadUnavailable
                ? error.code
                : "UNAVAILABLE",
          });
      });
    return () => controller.abort();
  }, [key, generation, read]);
  const current =
    result?.key === key && result.generation === generation
      ? result
      : undefined;
  return {
    value: current?.value,
    error: current?.error,
    loading: !current,
    reload: () => {
      setResult(undefined);
      setGeneration((value) => value + 1);
    },
  };
}
