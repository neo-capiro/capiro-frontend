"use client";
import { useState } from "react";
import { ActionButton, Modal } from "../../../../shared/module-ui";
import { SectionPreview } from "./SectionPreview";
/** Local read-only projection; native saved export remains a separate action. */
export function DocumentPreview({
  title,
  names,
  sections,
}: {
  title: string;
  names: string[];
  sections: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>Preview draft</ActionButton>
      <Modal open={open} onOpenChange={setOpen} title="Draft preview">
        <p>
          Local document, including unsaved edits. Saved exports may simplify
          formatting.
        </p>
        <h2>{title}</h2>
        {names.map((name) => (
          <section key={name} aria-label={name}>
            <h3>{name}</h3>
            <SectionPreview value={sections[name] ?? ""} />
          </section>
        ))}
      </Modal>
    </>
  );
}
