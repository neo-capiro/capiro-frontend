"use client";
import { useState } from "react";
import type { ProfileSubject } from "./subject";
import { sources, type Setup, type ProfileBuildRun } from "./contracts";
import { researchInputSchema, type ResearchInput } from "./research-contracts";
import { ResearchInputs } from "./ResearchInputs";
import styles from "./profile-build.module.css";

export function initialResearchInput(
  setup: Setup,
  previous?: ProfileBuildRun,
  scope: Pick<
    ResearchInput,
    "businessUnitId" | "purpose" | "capabilityId"
  > = {},
): ResearchInput {
  const imported = new Set(setup.selectedIdentities.map((value) => value.id));
  const purpose = scope.purpose ?? previous?.setup?.purpose;
  const capabilityId = scope.purpose
    ? scope.capabilityId
    : previous?.setup?.capabilityId;
  const businessUnitId = scope.purpose
    ? scope.businessUnitId
    : (scope.businessUnitId ?? previous?.setup?.businessUnit?.id);
  return {
    ...(purpose ? { purpose } : {}),
    ...(capabilityId ? { capabilityId } : {}),
    ...(businessUnitId ? { businessUnitId } : {}),
    sources:
      previous?.requestedSources.filter(
        (value): value is keyof typeof sources =>
          value in sources && (!purpose || value === "public_web"),
      ) ?? [],
    website: previous?.setup?.website ?? setup.website ?? "",
    attachmentIds: previous?.attachmentIds ?? [],
    ldaClientIds: purpose
      ? []
      : (previous?.selectedLdaIds?.filter((id) => !imported.has(id)) ?? []),
  };
}
export function ResearchRequest({
  subject,
  setup,
  previous,
  disabled,
  onStart,
  businessUnitId,
  purpose,
  capabilityId,
}: {
  subject: ProfileSubject;
  businessUnitId?: string;
  purpose?: ResearchInput["purpose"];
  capabilityId?: string;
  setup: Setup;
  previous?: ProfileBuildRun;
  disabled: boolean;
  onStart: (input: ResearchInput) => void;
}) {
  const [input, setInput] = useState(() =>
    initialResearchInput(setup, previous, {
      businessUnitId,
      purpose,
      capabilityId,
    }),
  );
  const [error, setError] = useState<string>();
  const ready = researchInputSchema.safeParse(input).success;
  return (
    <form
      className={styles.setup}
      aria-label="Research missing details"
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
      <h3>
        {input.purpose === "alignment"
          ? "Choose alignment sources"
          : input.purpose === "business_units"
            ? "Choose annual-report sources"
            : "Research missing details"}
      </h3>
      {input.purpose === "alignment" && (
        <p>
          Research suggests terms, classifications and supported funding or
          program lines for this saved capability. Every suggestion still
          requires review.
        </p>
      )}
      {input.purpose === "business_units" && (
        <p>
          Research looks for named business units in dated annual reports or
          10-K filings. Approve a sourced unit before researching its programs.
        </p>
      )}
      {input.purpose === "capabilities" && input.capabilityId && (
        <p>
          Research proposes sourced updates to this capability. It does not
          create a duplicate capability.
        </p>
      )}
      {input.businessUnitId && (
        <p>Research is scoped to the selected approved business unit.</p>
      )}
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
        subject={subject}
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
