"use client";
import { useMemo } from "react";
import DOMPurify from "dompurify";
import styles from "./email.module.css";

/** Display isolation only: the backend still sanitizes and appends its saved signature. */
function signatureDocument(html: string) {
  if (!DOMPurify.isSupported) return "";
  const content = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: [
      "a",
      "style",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "iframe",
      "video",
      "audio",
      "source",
      "link",
      "meta",
      "base",
    ],
    FORBID_ATTR: ["href", "srcset"],
  });
  content.querySelectorAll("img").forEach((image) => {
    if (
      !/^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,/i.test(
        image.getAttribute("src") ?? "",
      )
    )
      image.replaceWith(
        document.createTextNode(
          image.alt ? `[${image.alt}]` : "[Image hidden]",
        ),
      );
  });
  const body = document.createElement("div");
  body.append(content);
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:13px/1.45 system-ui;margin:12px;color:#0a0a0a;background:white;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>${body.innerHTML}`;
}

export function SignaturePreview({ html }: { html: string }) {
  const document = useMemo(() => signatureDocument(html), [html]);
  return (
    <div className="stack">
      <iframe
        className={styles.signaturePreview}
        title="Saved signature preview"
        sandbox=""
        referrerPolicy="no-referrer"
        srcDoc={document}
      />
      <small>Remote images and links are hidden in this preview.</small>
    </div>
  );
}
