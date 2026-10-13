"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { newsImportBody } from "../../../../../shared/capiro/operations/legiwatch-evidence-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";

export function useNewsImport(onStaged: () => void) {
  const [capture, setCapture] = useState<z.infer<typeof newsImportBody> | null>(
      null,
    ),
    [error, setError] = useState("");
  const key = useRef(""),
    fileGeneration = useRef(0);
  const preview = useCapiroMutation("legiwatch.evidence.import.preview"),
    stage = useCapiroMutation("legiwatch.evidence.import.stage");
  useEffect(
    () => () => {
      fileGeneration.current += 1;
    },
    [],
  );
  const load = async (file?: File) => {
    const generation = ++fileGeneration.current;
    setCapture(null);
    preview.reset();
    stage.reset();
    setError("");
    key.current = crypto.randomUUID();
    if (!file) return;
    try {
      if (file.size > 1000000)
        throw new Error("Choose a captured source file smaller than 1 MB.");
      const data = newsImportBody.parse(JSON.parse(await file.text()));
      if (generation === fileGeneration.current) setCapture(data);
    } catch {
      if (generation === fileGeneration.current)
        setError(
          "This capture must contain the 38 distinct news keywords and five alert families with their source identities.",
        );
    }
  };
  const review = async () => {
    if (!capture) return;
    try {
      await preview.run({ body: capture });
    } catch {
      /* Keep the selected capture. */
    }
  };
  const apply = async () => {
    if (!capture || !preview.data) return;
    try {
      await stage.run({ body: { ...capture, requestKey: key.current } });
      onStaged();
    } catch {
      /* Reuse the request key only for this exact capture. */
    }
  };
  return {
    capture,
    error,
    preview,
    stage,
    pending: preview.pending || stage.pending,
    load,
    review,
    apply,
  };
}
