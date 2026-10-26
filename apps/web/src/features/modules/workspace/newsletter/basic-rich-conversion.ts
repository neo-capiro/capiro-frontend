import {
  createNewsletterBlock,
  createNewsletterSection,
  defaultNewsletterConfig,
  defaultNewsletterStyles,
} from "@capiro/shared/newsletter";
import {
  newsletterBody,
  type NewsletterBlock,
  type NewsletterBody,
} from "../../../../shared/capiro/operations/workspace-documents";
import type { RichDraft } from "../rich-newsletter/draft";
import { safeNewsletterHref } from "./newsletter-model";

export type BasicConversion = {
  draft?: RichDraft;
  issues: string[];
  notes: string[];
};

/** Conversion is local and loss-refusing. The existing rich owner alone saves it. */
export function convertBasicNewsletter(
  name: string,
  input: unknown,
  clientId: string | null,
): BasicConversion {
  const parsed = newsletterBody.safeParse(input);
  if (!parsed.success)
    return {
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "Newsletter"}: ${issue.message}`,
      ),
      notes: [],
    };
  const body = parsed.data;
  const issues = conversionIssues(name, body);
  const notes = [
    "Creates a separate local rich draft. The basic newsletter stays unchanged; save the rich document explicitly.",
    "Images remain hidden in previews. Stored image URLs and alternative text are preserved.",
  ];
  if (body.blocks.some((block) => block.kind === "social"))
    notes.push(
      "Social links become ordinary link buttons, preserving their labels and destinations. No social network is inferred.",
    );
  if (issues.length) return { issues, notes };
  const styles = basicStyles();
  const blocks = body.blocks.map(convertBlock);
  if (body.firmName)
    blocks.unshift(createNewsletterBlock("paragraph", { text: body.firmName }));
  if (body.firmName || body.mailingAddress)
    blocks.push(
      createNewsletterBlock("paragraph", {
        text: [body.firmName, body.mailingAddress].filter(Boolean).join(" · "),
        style: { fontSize: 10 },
      }),
    );
  return {
    issues,
    notes,
    draft: {
      name,
      design: {
        version: 1,
        styles,
        sections: [createNewsletterSection("Converted newsletter", blocks)],
        ...(clientId ? { sourceClientIds: [clientId] } : {}),
      },
      config: {
        ...defaultNewsletterConfig(),
        clientId,
        subject: body.subject,
        previewText: body.preview,
        company: body.firmName,
        mailingAddress: body.mailingAddress,
        permissionReminder: "",
      },
    },
  };
}

function convertBlock(block: NewsletterBlock) {
  const next = createNewsletterBlock(
    block.kind === "social" ? "button" : block.kind,
  );
  next.text = block.text;
  if (block.kind === "image" || block.kind === "logo") {
    next.imageUrl = block.href ?? "";
    next.alt = block.text;
  } else if (block.kind === "button" || block.kind === "social") {
    next.url = block.href ?? "";
    next.linkType = block.href?.startsWith("mailto:") ? "email" : "web";
  }
  if (block.kind === "spacer") next.style.height = 24;
  return next;
}

function conversionIssues(name: string, body: NewsletterBody) {
  const issues: string[] = [];
  for (const field of [
    "subject",
    "preview",
    "firmName",
    "mailingAddress",
  ] as const)
    if (/\*\|[^|]+\|\*/.test(body[field]))
      issues.push(
        `${field}: merge-tag text would change meaning in rich delivery. Replace the literal tag before converting.`,
      );
  if (!name.trim() || name.length > 200)
    issues.push(
      "Document name must contain 1–200 characters for the rich library.",
    );
  const ids = new Set<string>();
  body.blocks.forEach((block, index) => {
    const label = `Block ${index + 1} (${block.kind})`;
    if (/\*\|[^|]+\|\*/.test(`${block.text}\n${block.href ?? ""}`))
      issues.push(
        `${label}: merge-tag text would change meaning in rich delivery. Replace the literal tag before converting.`,
      );
    if (ids.has(block.id)) issues.push(`${label}: duplicate block ID.`);
    ids.add(block.id);
    if (block.kind === "code")
      issues.push(
        `${label}: literal code cannot be converted to executable email HTML. Replace it with a paragraph or remove it before converting.`,
      );
    if (
      block.href &&
      (!safeNewsletterHref(block.href) ||
        (["image", "logo"].includes(block.kind) &&
          !/^https?:/i.test(block.href)))
    )
      issues.push(
        `${label}: unsupported URL. Use http or https for images, or http, https or mailto for links.`,
      );
    if (
      block.href &&
      !["image", "logo", "button", "social"].includes(block.kind)
    )
      issues.push(
        `${label}: this block has a link that the rich equivalent cannot preserve.`,
      );
    if (["divider", "spacer"].includes(block.kind) && block.text)
      issues.push(
        `${label}: this spacing block contains text. Move it into a paragraph before converting.`,
      );
  });
  return issues;
}

function basicStyles() {
  const styles = defaultNewsletterStyles();
  styles.background = styles.content = "#ffffff";
  styles.width = 660;
  for (const [key, value] of Object.entries(styles.text)) {
    value.color = key === "p" ? "#737373" : "#0a0a0a";
    value.fontFamily = key === "p" ? "Arial" : "Georgia";
    value.fontSize = key === "p" ? 13 : 30;
    value.lineHeight = key === "p" ? 1.6 : 1.45;
    value.bold = false;
  }
  styles.mobileText = structuredClone(styles.text);
  styles.link = { color: "#0a0a0a", underline: true };
  styles.button = {
    color: "#0a0a0a",
    background: "#ffffff",
    fontFamily: "Arial",
    fontSize: 13,
    underline: true,
  };
  return styles;
}
