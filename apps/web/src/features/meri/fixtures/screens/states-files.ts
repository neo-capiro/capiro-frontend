import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 copy; the canonical source for the matching live states. */
export const fileArtifactStates: StateBoardView = {
  title: "File states",
  description: "Implementation state board · Limits come from workspace policy",
  states: [
    {
      title: "Uploading",
      tone: "neutral",
      explanation:
        "The transfer is in progress. Cancel removes the unfinished upload.",
      action: "Cancel upload",
    },
    {
      title: "Partial extraction",
      tone: "warning",
      explanation:
        "Some pages were unreadable. Only extracted evidence is used.",
      action: "Review extraction",
    },
    {
      title: "Unsupported type",
      tone: "danger",
      explanation:
        "This file type is not enabled for analysis in this workspace.",
      action: "Choose another file",
    },
    {
      title: "Upload limit exceeded",
      tone: "danger",
      explanation:
        "The file exceeds the configured upload or processing limit.",
      action: "Choose another file",
    },
    {
      title: "Password-protected or corrupt",
      tone: "danger",
      explanation:
        "This file could not be opened. Attach an accessible version.",
      action: "Replace file",
    },
    {
      title: "Page limit reached",
      tone: "warning",
      explanation:
        "Processing stopped at the configured page limit; coverage is partial.",
      action: "View coverage",
    },
    {
      title: "Duplicate attachment",
      tone: "success",
      explanation:
        "This exact version is already attached; no second upload is needed.",
      action: "Open attached file",
    },
    {
      title: "Attachment access denied",
      tone: "danger",
      explanation: "The selected file is outside your current source grants.",
      action: "Choose permitted file",
    },
    {
      title: "Preview rendering failed",
      tone: "danger",
      explanation:
        "The preview could not be generated. Publishing is blocked pending checks.",
      action: "Retry rendering",
    },
    {
      title: "Stale version",
      tone: "warning",
      explanation:
        "A newer version exists. Review it before creating another revision.",
      action: "Compare versions",
    },
    {
      title: "Output saving failed",
      tone: "danger",
      explanation: "The result has not been published or marked recoverable.",
      action: "Retry save",
    },
    {
      title: "Verification failed",
      tone: "danger",
      explanation:
        "Layout or evidence checks failed. The previous verified version remains available.",
      action: "Open prior version",
    },
  ],
};
