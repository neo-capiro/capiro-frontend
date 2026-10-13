"use client";
import { useState } from "react";
import {
  findNewsletterBlock,
  type NewsletterBlock,
  type NewsletterBlockKind,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  PageHeader,
  TextInput,
  UnavailableAction,
} from "../../../../shared/module-ui";
import {
  addRichBlock,
  editRichBlock,
  editRichConfig,
  newRichDraft,
  removeRichBlock,
  type RichDraft,
} from "./draft";
import { RichBlockControls } from "./RichBlockControls";
import { RichPreview } from "./RichPreview";
import { RichStructure } from "./RichStructure";
import styles from "./rich-newsletter.module.css";

type History = { past: RichDraft[]; draft: RichDraft; future: RichDraft[] };
export function RichNewsletterEditor({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    draft: newRichDraft(),
    future: [],
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [plainText, setPlainText] = useState(false);
  const [closing, setClosing] = useState(false);
  const draft = history.draft;
  const selected = selectedId
    ? findNewsletterBlock(draft.design, selectedId)
    : null;
  const commit = (change: (draft: RichDraft) => RichDraft) =>
    setHistory((current) => ({
      past: [...current.past.slice(-29), current.draft],
      draft: change(current.draft),
      future: [],
    }));
  const update = (change: Partial<NewsletterBlock>) =>
    commit((current) => ({
      ...current,
      design: editRichBlock(current.design, selectedId!, (block) =>
        Object.assign(block, change),
      ),
    }));
  const add = (section: string, kind: NewsletterBlockKind) =>
    commit((current) => ({
      ...current,
      design: addRichBlock(current.design, section, kind).design,
    }));
  return (
    <section className={styles.screen}>
      <PageHeader
        title="Rich newsletter editor preview"
        description="Local draft only. Saving, collaboration and delivery are unavailable; leaving this view clears your edits."
        actions={
          <ActionButton onClick={() => setClosing(true)}>
            Close preview
          </ActionButton>
        }
      />
      {closing && (
        <div role="alert" className={styles.notice}>
          <p>Discard this local draft and leave the preview?</p>
          <ActionButton onClick={onClose}>Discard and leave</ActionButton>
          <ActionButton onClick={() => setClosing(false)}>
            Keep editing
          </ActionButton>
        </div>
      )}
      <div className={styles.toolbar}>
        <ActionButton
          disabled={!history.past.length}
          onClick={() =>
            setHistory((current) =>
              current.past.length
                ? {
                    past: current.past.slice(0, -1),
                    draft: current.past.at(-1)!,
                    future: [current.draft, ...current.future],
                  }
                : current,
            )
          }
        >
          Undo
        </ActionButton>
        <ActionButton
          disabled={!history.future.length}
          onClick={() =>
            setHistory((current) =>
              current.future.length
                ? {
                    past: [...current.past, current.draft],
                    draft: current.future[0]!,
                    future: current.future.slice(1),
                  }
                : current,
            )
          }
        >
          Redo
        </ActionButton>
        <ActionButton
          aria-pressed={mobile}
          onClick={() => setMobile((value) => !value)}
        >
          Mobile preview
        </ActionButton>
        <ActionButton
          aria-pressed={plainText}
          onClick={() => setPlainText((value) => !value)}
        >
          Plain text
        </ActionButton>
        <UnavailableAction reason="Saving rich newsletters is not available yet.">
          Save newsletter
        </UnavailableAction>
        <UnavailableAction reason="Save and review a newsletter before staging it.">
          Stage newsletter
        </UnavailableAction>
      </div>
      <CampaignFields draft={draft} change={commit} />
      <div className={styles.editor}>
        <RichStructure
          design={draft.design}
          selectedId={selectedId}
          select={setSelectedId}
          add={add}
        />
        <RichPreview draft={draft} mobile={mobile} plainText={plainText} />
        {selected ? (
          <RichBlockControls
            key={selected.id}
            block={selected}
            update={update}
            remove={() => {
              commit((current) => ({
                ...current,
                design: removeRichBlock(current.design, selected.id),
              }));
              setSelectedId(null);
            }}
          />
        ) : (
          <aside className={styles.controls}>
            <h2>Block settings</h2>
            <p>Select a block to edit its content and style.</p>
          </aside>
        )}
      </div>
    </section>
  );
}

function CampaignFields({
  draft,
  change,
}: {
  draft: RichDraft;
  change: (update: (draft: RichDraft) => RichDraft) => void;
}) {
  return (
    <div className={styles.fields}>
      <Field label="Newsletter name" htmlFor="rich-name">
        <TextInput
          id="rich-name"
          maxLength={200}
          value={draft.name}
          onChange={(event) =>
            change((current) => ({ ...current, name: event.target.value }))
          }
        />
      </Field>
      {(["subject", "previewText", "fromName", "replyTo"] as const).map(
        (key) => (
          <Field
            key={key}
            label={
              {
                subject: "Subject",
                previewText: "Preview text",
                fromName: "From name",
                replyTo: "Reply-to email",
              }[key]
            }
            htmlFor={`rich-${key}`}
          >
            <TextInput
              id={`rich-${key}`}
              value={draft.config[key]}
              onChange={(event) =>
                change((current) => ({
                  ...current,
                  config: editRichConfig(
                    current.config,
                    key,
                    event.target.value,
                  ),
                }))
              }
            />
          </Field>
        ),
      )}
    </div>
  );
}
