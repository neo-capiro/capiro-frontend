"use client";
import { Streamdown } from "streamdown";
import type { ComponentProps } from "react";

/** Shared source-link policy for static descriptions and explicit toolbar edits. */
export function safeMarkdownLink(value: string): string | null {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  if (/^(?:#|\/(?!\/)|\.\.?\/)/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
const components: NonNullable<ComponentProps<typeof Streamdown>["components"]> =
  {
    strong: ({ children }) => <strong>{children}</strong>,
    a: ({ href, children }) => {
      const target = href ? safeMarkdownLink(href) : null;
      return target ? (
        <a
          href={target}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          {children}
        </a>
      ) : (
        <span>{children}</span>
      );
    },
    img: ({ alt }) => <span>{alt ? `Image: ${alt}` : "Image"}</span>,
    input: ({ checked }) => (
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled
        aria-label={
          checked ? "Completed checklist item" : "Incomplete checklist item"
        }
      />
    ),
  };
const elements = [
  "p",
  "br",
  "strong",
  "em",
  "del",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "input",
  "a",
  "img",
  "blockquote",
  "pre",
  "code",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "sup",
  "section",
];
/** Static Markdown/GFM only. Never promotes stored HTML to executable markup. */
export function MarkdownContent({
  source,
  className,
}: {
  source: string;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <Streamdown
        mode="static"
        parseIncompleteMarkdown={false}
        normalizeHtmlIndentation={false}
        skipHtml
        rehypePlugins={[]}
        remarkRehypeOptions={{ allowDangerousHtml: false }}
        allowedElements={elements}
        controls={false}
        // Streamdown caps tables and code blocks with an inline max-height and relies on its own
        // Tailwind overflow utilities to scroll them. This app ships no Tailwind, so the capped box
        // painted its overflow under the next paragraph; blocks take their full height instead.
        tableMaxHeight="none"
        codeBlockMaxHeight="none"
        plugins={{}}
        components={components}
        urlTransform={(value) => safeMarkdownLink(value) ?? ""}
      >
        {source}
      </Streamdown>
    </div>
  );
}
