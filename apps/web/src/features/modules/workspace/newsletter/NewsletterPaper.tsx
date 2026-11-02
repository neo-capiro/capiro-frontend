"use client";
import type {
  NewsletterBlock,
  NewsletterBody,
} from "@/shared/capiro/operations/workspace-documents";
import { safeNewsletterHref } from "./newsletter-model";
import styles from "../workspace.module.css";
import fidelity from "./basic-fidelity.module.css";
function RenderBlock({ block }: { block: NewsletterBlock }) {
  if (block.kind === "heading")
    return <h2 style={{ whiteSpace: "pre-line" }}>{block.text}</h2>;
  if (block.kind === "divider") return <hr />;
  if (block.kind === "spacer") return <div style={{ height: 24 }} />;
  if (block.kind === "button" || block.kind === "social")
    return safeNewsletterHref(block.href ?? "") ? (
      <p>
        <strong>{block.text}</strong>
        <br />
        <span>{block.href}</span>
      </p>
    ) : (
      <strong>{block.text}</strong>
    );
  if (block.kind === "image" || block.kind === "logo")
    return (
      <div className={fidelity.imagePlaceholder}>
        <span>{block.text || (block.kind === "logo" ? "Logo" : "Image")}</span>
        <small>
          {block.href
            ? "Image hidden in preview · URL preserved"
            : "Image source needed"}
        </small>
      </div>
    );
  if (block.kind === "code")
    return (
      <div>
        <pre className={fidelity.literal}>{block.text}</pre>
        <span className={fidelity.qualification}>
          Literal code · HTML is not executed
        </span>
      </div>
    );
  return <p style={{ whiteSpace: "pre-line" }}>{block.text}</p>;
}

/** Safe original-format rendering; selection is controlled by the shared workspace. */
export function NewsletterPaper({
  body,
  mobile,
  selectedId,
  select,
}: {
  body: NewsletterBody;
  mobile?: boolean;
  selectedId?: string;
  select?: (id: string) => void;
}) {
  return (
    <article
      className={`${styles.newsletterPaper} ${fidelity.paper} ${mobile ? styles.mobile : ""}`}
    >
      <p>{body.firmName || "CLIENT UPDATE"}</p>
      <p className={fidelity.qualification}>
        Images and live links are disabled in this preview.
      </p>
      {body.blocks.map((block) => (
        <section key={block.id} className={styles.newsletterBlock}>
          {select ? (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Select ${block.kind} block`}
              aria-pressed={selectedId === block.id}
              className={fidelity.selectable}
              onClick={() => select(block.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(block.id);
                }
              }}
            >
              <RenderBlock block={block} />
            </div>
          ) : (
            <RenderBlock block={block} />
          )}
        </section>
      ))}
      <p>
        {body.firmName}
        {body.mailingAddress ? ` · ${body.mailingAddress}` : ""}
      </p>
    </article>
  );
}
