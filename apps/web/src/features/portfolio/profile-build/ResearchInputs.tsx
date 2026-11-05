import { useResearchFiles } from "./research-files";
import type { ProfileSubject } from "./subject";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { sources, type Setup } from "./contracts";
import { canResearchFile, type ResearchInput } from "./research-contracts";
import { ResearchChoices } from "./ResearchChoices";

export function ResearchInputs({
  subject,
  setup,
  input,
  disabled,
  onChange,
}: {
  subject: ProfileSubject;
  setup: Setup;
  input: ResearchInput;
  disabled: boolean;
  onChange: (patch: Partial<ResearchInput>) => void;
}) {
  const imported = new Set(
    setup.selectedIdentities.map((identity) => identity.id),
  );
  const identities = [
    ...setup.selectedIdentities,
    ...setup.suggestedIdentities.filter(
      (identity) => !imported.has(identity.id),
    ),
  ];
  return (
    <>
      <ResearchChoices
        legend="Connected sources"
        disabled={disabled}
        options={(Object.keys(sources) as (keyof typeof sources)[])
          .filter((value) => !input.purpose || value === "public_web")
          .filter((value) =>
            setup.availableSources
              ? setup.availableSources.includes(value)
              : subject.kind === "client" ||
                ["public_web", "sam_gov", "lda"].includes(value),
          )
          .map((value) => ({ value, label: sources[value] }))}
        selected={input.sources}
        onChange={(values) => onChange({ sources: values })}
      />
      {!input.purpose && (
        <>
          <ResearchChoices
            legend="LDA identities"
            disabled={disabled || !input.sources.includes("lda")}
            options={identities.map((identity) => ({
              value: identity.id,
              label: identity.name,
              required: imported.has(identity.id),
            }))}
            selected={input.ldaClientIds}
            onChange={(values) => onChange({ ldaClientIds: values })}
          />
          <p>
            Imported identities remain included when LDA is selected. Additional
            choices are saved with this run for review.
          </p>
          {input.ldaClientIds.length > 0 && (
            <button
              type="button"
              className="button"
              disabled={disabled}
              onClick={() => onChange({ ldaClientIds: [] })}
            >
              Clear additional identities
            </button>
          )}
        </>
      )}
      <ResearchDocuments
        subject={subject}
        selected={input.attachmentIds}
        disabled={disabled}
        onChange={(values) => onChange({ attachmentIds: values })}
      />
    </>
  );
}
function ResearchDocuments({
  subject,
  selected,
  disabled,
  onChange,
}: {
  subject: ProfileSubject;
  selected: string[];
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  const files = useResearchFiles(subject);
  const available =
    files.data
      ?.filter((file) => canResearchFile(file, subject))
      .map((file) => file.id) ?? [];
  return (
    <>
      <QueryState
        pending={files.isPending}
        error={files.error}
        retry={() => void files.refetch()}
      />
      {files.data && !files.error && (
        <ResearchChoices
          legend="Profile documents (up to 10)"
          disabled={disabled}
          options={files.data
            .filter((file) =>
              subject.kind === "client"
                ? file.clientId === subject.id
                : "prospectId" in file && file.prospectId === subject.id,
            )
            .map((file) => ({
              value: file.id,
              label:
                file.fileName +
                " · " +
                (available.includes(file.id) ? "Ready" : "Unavailable"),
              disabled: !available.includes(file.id),
            }))}
          selected={selected}
          onChange={onChange}
        />
      )}
      {!files.isPending && selected.some((id) => !available.includes(id)) && (
        <p role="alert">
          A previous document is unavailable.{" "}
          <button
            className="button"
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(selected.filter((id) => available.includes(id)))
            }
          >
            Remove unavailable documents
          </button>
        </p>
      )}
    </>
  );
}
