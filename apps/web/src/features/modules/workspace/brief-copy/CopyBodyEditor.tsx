"use client";
import { useRef, useState } from "react";
import type { BriefCopyBody } from "@/shared/capiro/operations/workspace-brief-copy";
import { ActionButton, Panel, TextArea } from "@/shared/module-ui";
import { SectionEditor } from "../rich-document/SectionEditor";
import { SectionPreview } from "../rich-document/SectionPreview";
import { parseCopyBody, replaceCopySection } from "./body";

export function CopyBodyEditor({
  body,
  disabled,
  onChange,
  onDraftBlocked,
}: {
  body: BriefCopyBody;
  disabled: boolean;
  onChange: (body: BriefCopyBody) => void;
  onDraftBlocked: (blocked: boolean) => void;
}) {
  const [json, setJson] = useState<string>();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  // Tiptap can retain a rejected local document until that same editor is
  // corrected or explicitly replaced. A different section cannot admit it.
  const rejectedSections = useRef(new Set<string>());
  return (
    <div className="stack">
      <div className="row">
        <ActionButton
          disabled={disabled || json !== undefined}
          onClick={() => {
            if (!disabled) {
              setJson(JSON.stringify(body, null, 2));
              setError("");
              onDraftBlocked(true);
            }
          }}
        >
          Edit full document JSON
        </ActionButton>
        <ActionButton onClick={() => setPreview((value) => !value)}>
          {preview ? "Close local preview" : "Local section preview"}
        </ActionButton>
      </div>
      <p>
        Section edits retain all other JSON, including marks, images and table
        cells. The local preview renders section text only; other rich
        structures remain available in full JSON.
      </p>
      {error && <p role="alert">{error}</p>}
      {json !== undefined ? (
        <Panel title="Full copied document JSON">
          <TextArea
            aria-label="Full copied document JSON"
            value={json}
            disabled={disabled}
            onChange={(event) => {
              if (!disabled) setJson(event.target.value);
            }}
          />
          <ActionButton
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              try {
                onChange(parseCopyBody(json));
                rejectedSections.current.clear();
                setJson(undefined);
                setError("");
                onDraftBlocked(false);
              } catch {
                setError(
                  "Enter a valid complete Workspace body with ordered blocks. Invalid or excessive JSON was not applied.",
                );
              }
            }}
          >
            Apply JSON to local draft
          </ActionButton>
          <ActionButton
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                rejectedSections.current.clear();
                setJson(undefined);
                setError("");
                onDraftBlocked(false);
              }
            }}
          >
            Cancel JSON edit
          </ActionButton>
          <p>
            Apply these edits to the local draft before using Save copied tab.
          </p>
        </Panel>
      ) : (
        body.blocks.map((block) => (
          <Panel
            key={block.id}
            title={block.title || `${block.type} · ${block.id}`}
          >
            {block.type === "section" ? (
              preview ? (
                <SectionPreview value={block.content ?? ""} />
              ) : (
                <SectionEditor
                  name={block.title || block.id}
                  value={block.content ?? ""}
                  disabled={disabled}
                  onChange={(content) => {
                    if (disabled) return;
                    try {
                      onChange(replaceCopySection(body, block.id, content));
                      rejectedSections.current.delete(block.id);
                      const blocked = rejectedSections.current.size > 0;
                      if (!blocked) setError("");
                      onDraftBlocked(blocked);
                    } catch {
                      rejectedSections.current.add(block.id);
                      setError(
                        "This section edit exceeds the complete document bounds. Shorten it or review the full JSON before saving.",
                      );
                      onDraftBlocked(true);
                    }
                  }}
                />
              )
            ) : (
              <p>
                This {block.type} block is retained in full. Inspect or change
                its fields in the full JSON editor.
              </p>
            )}
          </Panel>
        ))
      )}
    </div>
  );
}
