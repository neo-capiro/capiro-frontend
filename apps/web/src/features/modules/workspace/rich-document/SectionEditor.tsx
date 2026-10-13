"use client";
import { useState } from "react";
import { ActionButton, TextArea } from "../../../../shared/module-ui";
import { isRichSection, plainSectionHtml, sectionSizeError } from "./content";
import { RichDocumentEditor } from "./RichDocumentEditor";
export function SectionEditor({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [formatted, setFormatted] = useState(() => isRichSection(value));
  const error = sectionSizeError(value);
  return (
    <div className="stack">
      {formatted ? (
        <RichDocumentEditor
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <>
          <TextArea
            aria-label={`${name} content`}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
          />
          <ActionButton
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onChange(plainSectionHtml(value));
              setFormatted(true);
            }}
          >
            Format text
          </ActionButton>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
