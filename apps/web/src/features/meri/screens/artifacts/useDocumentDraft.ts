"use client";
import { useCallback, useState } from "react";
import type { DocumentPageView, RevisionSuggestion } from "./types";

export type DocumentOverlay = "blocks" | "comments" | "mode" | "revision";
export type DocumentMode = "Editing" | "Suggesting";

/** Local, unsaved document view state: page, zoom, open overlay, mode and applied suggestion. */
export function useDocumentDraft(
  initial: readonly DocumentPageView[],
  suggestion: RevisionSuggestion,
) {
  const [pages, setPages] = useState(initial);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [overlay, setOverlay] = useState<DocumentOverlay | null>(null);
  const [mode, setMode] = useState<DocumentMode>("Editing");
  const [applied, setApplied] = useState<string | null>(null);
  const close = useCallback(() => setOverlay(null), []);
  const toggle = (id: DocumentOverlay) =>
    setOverlay((current) => (current === id ? null : id));
  const apply = (how: "replace" | "insert") => {
    const at = suggestion.blockIndex;
    const block = { kind: "paragraph", text: suggestion.text } as const;
    setPages((current) =>
      current.map((page, index) =>
        index !== 0
          ? page
          : {
              ...page,
              blocks:
                how === "replace"
                  ? page.blocks.map((item, i) => (i === at ? block : item))
                  : [
                      ...page.blocks.slice(0, at + 1),
                      block,
                      ...page.blocks.slice(at + 1),
                    ],
            },
      ),
    );
    setPageIndex(0);
    setOverlay(null);
    setApplied(
      how === "replace"
        ? "Suggestion replaced the paragraph in this local working copy. Nothing was saved."
        : "Suggestion inserted below the paragraph in this local working copy. Nothing was saved.",
    );
  };
  return {
    pages,
    page: pages[pageIndex] ?? pages[0],
    pageIndex,
    setPageIndex,
    zoom,
    setZoom,
    overlay,
    toggle,
    close,
    mode,
    setMode,
    applied,
    apply,
  };
}
