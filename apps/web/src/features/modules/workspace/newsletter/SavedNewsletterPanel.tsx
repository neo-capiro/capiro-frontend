"use client";
import type {
  NewsletterBlock,
  NewsletterBody,
} from "@/shared/capiro/operations/workspace-documents";
import { Field, TextInput } from "@/shared/module-ui";
import { ContentBlocks } from "../rich-newsletter/WorkspacePalette";
import {
  BasicConversionButton,
  type BasicConversionCandidate,
} from "./BasicConversion";
import { SavedBlockFields } from "./SavedBlockFields";

const kinds: NewsletterBlock["kind"][] = [
  "image",
  "heading",
  "paragraph",
  "button",
  "divider",
  "spacer",
  "social",
  "logo",
  "code",
];

export function SavedNewsletterPanel({
  body,
  edit,
  rail,
  selectedId,
  select,
  details,
  closeDetails,
  name,
  clientId,
  onConvert,
  conversionDisabled,
}: {
  body: NewsletterBody;
  edit: (body: NewsletterBody) => void;
  rail: string;
  selectedId?: string;
  select: (id?: string) => void;
  details: boolean;
  closeDetails: () => void;
  name: string;
  clientId: string | null;
  onConvert?: (candidate: BasicConversionCandidate) => void;
  conversionDisabled: boolean;
}) {
  const selected = body.blocks.find((block) => block.id === selectedId);
  const move = (offset: number) => {
    const blocks = [...body.blocks];
    const index = blocks.findIndex((block) => block.id === selectedId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
    edit({ ...body, blocks });
  };
  if (details)
    return (
      <>
        <button onClick={closeDetails}>Back to blocks</button>
        <h2>Newsletter details</h2>
        {(
          [
            ["subject", "Subject", 400],
            ["preview", "Preview text", 500],
            ["firmName", "Firm name", 200],
            ["mailingAddress", "Mailing address", 500],
          ] as const
        ).map(([field, label, limit]) => (
          <Field key={field} label={label} htmlFor={`newsletter-${field}`}>
            <TextInput
              id={`newsletter-${field}`}
              value={body[field]}
              maxLength={limit}
              onChange={(event) =>
                edit({ ...body, [field]: event.target.value })
              }
            />
          </Field>
        ))}
        <p>Recipients and sender are selected in Outreach.</p>
      </>
    );
  if (selected && rail === "Blocks")
    return (
      <>
        <button onClick={() => select(undefined)}>Back to blocks</button>
        <h2>{selected.kind[0]!.toUpperCase() + selected.kind.slice(1)}</h2>
        <SavedBlockFields
          key={JSON.stringify(selected)}
          block={selected}
          onSave={(block) =>
            edit({
              ...body,
              blocks: body.blocks.map((item) =>
                item.id === block.id ? block : item,
              ),
            })
          }
        />
        <button
          disabled={body.blocks[0]?.id === selected.id}
          onClick={() => move(-1)}
        >
          Move up
        </button>
        <button
          disabled={body.blocks.at(-1)?.id === selected.id}
          onClick={() => move(1)}
        >
          Move down
        </button>
        <button
          onClick={() => {
            edit({
              ...body,
              blocks: body.blocks.filter((block) => block.id !== selected.id),
            });
            select(undefined);
          }}
        >
          Remove block
        </button>
      </>
    );
  return (
    <>
      <h2>{rail === "Blocks" ? "Add content" : rail}</h2>
      {rail === "Blocks" && (
        <ContentBlocks
          kinds={kinds}
          disabled={body.blocks.length >= 100}
          add={(kind) => {
            if (
              !kinds.includes(kind as NewsletterBlock["kind"]) ||
              body.blocks.length >= 100
            )
              return;
            const id = crypto.randomUUID();
            edit({
              ...body,
              blocks: [
                ...body.blocks,
                {
                  id,
                  kind: kind as NewsletterBlock["kind"],
                  text: ["divider", "spacer"].includes(kind)
                    ? ""
                    : `New ${kind}`,
                },
              ],
            });
            select(id);
          }}
        />
      )}
      {rail === "Sections" && (
        <ol>
          {body.blocks.map((block) => (
            <li key={block.id}>
              <button onClick={() => select(block.id)}>
                {block.kind}: {block.text.slice(0, 50) || "Empty"}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p>
        This saved newsletter uses a single-column format. Editing and saving
        keeps its original document and revision history.
      </p>
      <p>
        To use columns, custom styles or AI blocks, review a separate rich copy.
        Your original saved newsletter stays available in Documents.
      </p>
      {onConvert && (
        <BasicConversionButton
          name={name}
          body={body}
          clientId={clientId}
          disabled={conversionDisabled}
          onReview={onConvert}
        />
      )}
    </>
  );
}
