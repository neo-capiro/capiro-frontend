"use client";
import { useState } from "react";
import { sources, type Setup, type FillRun } from "./contracts";
import { researchInputSchema, type ResearchInput } from "./research-contracts";
import { ResearchInputs } from "./ResearchInputs";
import styles from "./enrichment.module.css";

function initialInput(setup: Setup, previous?: FillRun): ResearchInput {
  const imported = new Set(setup.selectedIdentities.map((value) => value.id));
  return {
    sources:
      previous?.requestedSources.filter(
        (value): value is keyof typeof sources => value in sources,
      ) ?? [],
    website: previous?.setup?.website ?? setup.website ?? "",
    attachmentIds: previous?.attachmentIds ?? [],
    ldaClientIds:
      previous?.selectedLdaIds?.filter((id) => !imported.has(id)) ?? [],
  };
}
export function ResearchSetup({
  clientId,
  setup,
  previous,
  disabled,
  onStart,
}: {
  clientId: string;
  setup: Setup;
  previous?: FillRun;
  disabled: boolean;
  onStart: (input: ResearchInput) => void;
}) {
  const [input, setInput] = useState(() => initialInput(setup, previous));
  const [error, setError] = useState<string>();
  const ready = researchInputSchema.safeParse(input).success;
  return (
    <form
      className={styles.setup}
      aria-label="Research setup"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = researchInputSchema.safeParse(input);
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Review the selected inputs.",
          );
          return;
        }
        setError(undefined);
        onStart(parsed.data);
      }}
    >
      <h3>Research {setup.clientName}</h3>
      <p>
        Research saves provisional findings. Review and apply the findings you
        want to keep.
      </p>
      <label>
        Research website
        <input
          type="url"
          value={input.website}
          maxLength={500}
          disabled={disabled}
          onChange={(event) =>
            setInput({ ...input, website: event.target.value.trim() })
          }
          placeholder="Website URL"
        />
      </label>
      <p>
        The website is used for this run. Leave it blank to use the saved
        website. Your saved client website changes only after you apply a
        finding.
      </p>
      <ResearchInputs
        clientId={clientId}
        setup={setup}
        input={input}
        disabled={disabled}
        onChange={(patch) => setInput({ ...input, ...patch })}
      />
      {error && <p role="alert">{error}</p>}
      <button
        className="button primary"
        type="submit"
        disabled={disabled || !ready}
      >
        Start selected research
      </button>
    </form>
  );
}
