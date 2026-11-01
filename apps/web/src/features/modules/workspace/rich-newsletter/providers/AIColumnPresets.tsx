"use client";
import { useMemo, useState } from "react";
import {
  createNewsletterBlock,
  type NewsletterDesign,
} from "@capiro/shared/newsletter";
import { WritingTool } from "./WritingTool";
import { aiColumnAction, AI_COLUMN_PRESETS } from "../content/presets";
import { changeStructure, type StructureAction } from "../content/structure";

export function AIColumnPresets({
  documentId,
  design,
  proposalScope,
  change,
  expanded = false,
}: {
  documentId?: string;
  design: NewsletterDesign;
  proposalScope: string;
  change: (action: StructureAction) => void;
  expanded?: boolean;
}) {
  const [sourceBlock] = useState(() =>
    createNewsletterBlock("paragraph", { text: "" }),
  );
  const insertionError = useMemo(() => {
    try {
      changeStructure(design, aiColumnAction(design, ""));
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "The columns cannot be inserted here.";
    }
  }, [design]);
  const Container = expanded ? "div" : "details";
  return (
    <Container>
      {expanded ? (
        <h3>AI-generated columns</h3>
      ) : (
        <summary>AI-generated columns</summary>
      )}
      {insertionError ? (
        <p role="status">{insertionError}</p>
      ) : documentId ? (
        <WritingTool
          documentId={documentId}
          block={sourceBlock}
          proposalScope={proposalScope}
          presets={AI_COLUMN_PRESETS}
          usageDescription="Use text adds two columns to the Body section (or the first section), with your reviewed text in the first column. This is a local edit you can Undo before saving."
          update={(value) => {
            if (value.text) change(aiColumnAction(design, value.text));
          }}
        />
      ) : (
        <>
          {expanded &&
            AI_COLUMN_PRESETS.map((preset) => (
              <button key={preset.label} disabled>
                {preset.label}
              </button>
            ))}
          <p>Save and verify the newsletter before generating columns.</p>
        </>
      )}
    </Container>
  );
}
