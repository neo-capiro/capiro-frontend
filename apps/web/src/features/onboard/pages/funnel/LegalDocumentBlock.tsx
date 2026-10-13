import type React from "react";
import { Card, Checkbox, Icon } from "../../ui/primitives";

export function LegalBlock({
  title,
  html,
  checked,
  onChange,
  label,
  downloadHref,
}: {
  title: string;
  html: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  downloadHref?: string;
}) {
  return (
    <Card pad={0} style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border-1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name="ScrollText" size={15} style={{ color: "var(--ink-3)" }} />
        <b style={{ fontSize: 13.5 }}>{title}</b>
        {downloadHref && (
          <a
            href={downloadHref}
            download
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon name="Download" size={12} />
            Download PDF
          </a>
        )}
      </div>
      <div
        style={{
          height: 130,
          overflowY: "auto",
          padding: "12px 18px",
          background: "var(--bg-surface-2)",
          fontSize: 11.5,
          lineHeight: 1.65,
          color: "var(--ink-2)",
          whiteSpace: "pre-wrap",
          fontFamily: "var(--font-mono)",
          letterSpacing: 0,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div
        style={{ padding: "12px 18px", borderTop: "1px solid var(--border-1)" }}
      >
        <Checkbox checked={checked} onChange={onChange}>
          {label}
        </Checkbox>
      </div>
    </Card>
  );
}
