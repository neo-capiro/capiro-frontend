import { useFiles } from "@/features/portfolio/files/public";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { sources, type Setup } from "./contracts";
import { canResearchFile, type ResearchInput } from "./research-contracts";
import { ResearchChoices } from "./ResearchChoices";

export function ResearchInputs({
  clientId,
  setup,
  input,
  disabled,
  onChange,
}: {
  clientId: string;
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
        options={(Object.keys(sources) as (keyof typeof sources)[]).map(
          (value) => ({ value, label: sources[value] }),
        )}
        selected={input.sources}
        onChange={(values) => onChange({ sources: values })}
      />
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
      <ResearchDocuments
        clientId={clientId}
        selected={input.attachmentIds}
        disabled={disabled}
        onChange={(values) => onChange({ attachmentIds: values })}
      />
    </>
  );
}
function ResearchDocuments({
  clientId,
  selected,
  disabled,
  onChange,
}: {
  clientId: string;
  selected: string[];
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  const files = useFiles(clientId);
  const available =
    files.data
      ?.filter((file) => canResearchFile(file, clientId))
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
          legend="Client documents (up to 10)"
          disabled={disabled}
          options={files.data
            .filter((file) => file.clientId === clientId)
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
