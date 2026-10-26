"use client";
import { useState } from "react";
import {
  parseWorkspaceBlueprintContentVersion,
  parseWorkspaceBlueprintDefinition,
  parseWorkspaceBlueprintSampleTest,
  type WorkspaceBlueprintDefinition,
  type WorkspaceBlueprintDetail,
} from "@capiro/shared/workspace-template-studio";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import { ActionButton, Modal } from "../../../../shared/module-ui";
import {
  BlueprintDefinitionFields,
  StudioJson,
} from "./BlueprintDefinitionFields";
import { sameStudioValue, type StudioWrite } from "./studio-write";
import styles from "./studio-authoring.module.css";

type ContentVersion = Extract<
  ReturnType<typeof parseWorkspaceBlueprintContentVersion>,
  { ok: true }
>["value"];
function initialDefinition(
  blueprint: WorkspaceBlueprintDetail,
): WorkspaceBlueprintDefinition {
  return {
    schemaVersion: 1,
    documentType: {
      id: blueprint.slug,
      label: blueprint.name,
      product: blueprint.product,
    },
    intakeQuestions: [],
    sections: [],
    evidencePolicy: {
      minimumSources: 0,
      primarySourcesPreferred: false,
      citationRequiredFor: [],
      freshnessRules: [],
    },
    contentRules: {
      requiredTerms: [],
      prohibitedTerms: [],
      requiredDisclaimers: [],
      instructions: [],
    },
    defaultTheme: { id: "default", name: "Default", settings: {} },
  };
}
export async function readBlueprintContent(
  writer: StudioWrite,
  expected: { blueprintId: string; versionId: string },
  signal: AbortSignal,
) {
  const raw = await writer.api.request(
    "workspace.blueprints.version",
    { params: expected },
    { signal },
  );
  const received = parseWorkspaceBlueprintContentVersion(raw, expected);
  if (!received.ok)
    throw new Error("Could not verify the saved blueprint version.");
  return received.value;
}
function assertUnchanged(expected: ContentVersion, current: ContentVersion) {
  if (
    current.status !== expected.status ||
    current.definitionHash !== expected.definitionHash ||
    current.version !== expected.version
  )
    throw new Error("This version changed. Refresh it before continuing.");
}

function DefinitionRead({ value }: { value: WorkspaceBlueprintDefinition }) {
  return (
    <div className={styles.read}>
      <h3>{value.documentType.label}</h3>
      <section
        className={styles.sectionList}
        aria-label="Saved blueprint sections"
        data-design-node="1064:261224"
      >
        <header>
          <h3>Blueprint sections</h3>
        </header>
        {value.sections.map((section) => (
          <div className={styles.section} key={section.id}>
            <strong>{section.title}</strong>
            <p>
              {section.required ? "Required" : "Optional"} ·{" "}
              {section.removable ? "Removable" : "Fixed"} ·{" "}
              {section.reorderable ? "Reorderable" : "Fixed order"}
              {section.lockedByDefault ? " · Locked by default" : ""}
            </p>
            <p>{section.purpose}</p>
            <p>{section.instructions}</p>
            <p>
              Target: {section.targetWords.min}–{section.targetWords.max} words
            </p>
            {section.evidenceRules.length > 0 && (
              <ul>
                {section.evidenceRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
      <details>
        <summary>Intake questions · {value.intakeQuestions.length}</summary>
        {value.intakeQuestions.map((q) => (
          <div className={styles.section} key={q.id}>
            <strong>{q.label}</strong>
            <p>{q.helpText}</p>
            <p>
              {q.required ? "Required" : "Optional"} ·{" "}
              {q.answerSource.replaceAll("_", " ")}
            </p>
            {q.condition && (
              <p>
                When {q.condition.field}{" "}
                {q.condition.operator.replaceAll("_", " ")}
                {q.condition.value !== undefined
                  ? ` ${JSON.stringify(q.condition.value)}`
                  : ""}
              </p>
            )}
          </div>
        ))}
      </details>
      <details>
        <summary>Evidence and content rules</summary>
        <dl>
          <dt>Minimum sources</dt>
          <dd>{value.evidencePolicy.minimumSources}</dd>
          <dt>Prefer primary sources</dt>
          <dd>{value.evidencePolicy.primarySourcesPreferred ? "Yes" : "No"}</dd>
        </dl>
        <pre>
          {JSON.stringify(
            {
              citationsRequiredFor: value.evidencePolicy.citationRequiredFor,
              freshnessRules: value.evidencePolicy.freshnessRules,
              ...value.contentRules,
            },
            null,
            2,
          )}
        </pre>
      </details>
      <details>
        <summary>Embedded theme · {value.defaultTheme.name}</summary>
        <p>Settings stored with this blueprint version.</p>
        <pre>{JSON.stringify(value.defaultTheme.settings, null, 2)}</pre>
      </details>
    </div>
  );
}

function BlueprintDraftEditor({
  blueprint,
  version,
  writer,
  onClose,
  onChanged,
}: {
  blueprint: WorkspaceBlueprintDetail;
  version: ContentVersion;
  writer: StudioWrite;
  onClose: () => void;
  onChanged: (id: string) => void;
}) {
  const saved = parseWorkspaceBlueprintDefinition(version.definition);
  const [value, setValue] = useState<WorkspaceBlueprintDefinition | undefined>(
    saved.ok
      ? saved.value
      : Object.keys(version.definition).length === 0
        ? initialDefinition(blueprint)
        : undefined,
  );
  const [error, setError] = useState<string>();
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && writer.phase !== "pending") onClose();
      }}
      closeDisabled={writer.phase === "pending"}
      title={`Edit blueprint · v${version.version}`}
      className={styles.dialog}
    >
      {value ? (
        <form
          className={styles.fields}
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = parseWorkspaceBlueprintDefinition(value);
            if (!parsed.ok) {
              setError(
                "Complete the definition fields and valid word ranges before saving.",
              );
              return;
            }
            setError(undefined);
            void writer.run("Save blueprint", async (send, signal) => {
              const params = {
                blueprintId: blueprint.id,
                versionId: version.id,
              };
              assertUnchanged(
                version,
                await readBlueprintContent(writer, params, signal),
              );
              const raw = await send(() =>
                writer.api.request(
                  "workspace.blueprints.save",
                  {
                    params,
                    body: {
                      definition: parsed.value,
                      expectedDefinitionHash: version.definitionHash,
                    },
                  },
                  { signal },
                ),
              );
              const receipt = parseWorkspaceBlueprintContentVersion(
                raw,
                params,
              );
              if (
                !receipt.ok ||
                receipt.value.status !== "draft" ||
                !sameStudioValue(receipt.value.definition, parsed.value)
              )
                throw new Error(
                  "Save receipt did not match the edited definition.",
                );
              const current = await readBlueprintContent(
                writer,
                params,
                signal,
              );
              assertUnchanged(receipt.value, current);
              if (!sameStudioValue(current.definition, parsed.value))
                throw new Error("Saved definition did not match.");
              if (!signal.aborted) {
                onChanged(current.id);
                onClose();
              }
            });
          }}
        >
          <p>
            Changes apply to this draft version. Published versions remain
            immutable.
          </p>
          <fieldset
            disabled={writer.locked}
            className={`${styles.fields} ${styles.unframed}`}
          >
            <BlueprintDefinitionFields value={value} onChange={setValue} />
            {error && <p role="alert">{error}</p>}
            <ActionButton type="submit" primary>
              Save definition
            </ActionButton>
          </fieldset>
          {writer.message && (
            <p
              role={
                writer.phase === "unknown" || writer.phase === "refused"
                  ? "alert"
                  : "status"
              }
            >
              {writer.message}
            </p>
          )}
        </form>
      ) : (
        <div className={styles.fields}>
          <p>
            The saved draft has an incomplete definition. Review it before
            replacing it with a new definition.
          </p>
          <pre>{JSON.stringify(version.definition, null, 2)}</pre>
          <ActionButton onClick={() => setValue(initialDefinition(blueprint))}>
            Replace incomplete definition
          </ActionButton>
        </div>
      )}
    </Modal>
  );
}

function BlueprintSampleTest({
  version,
  writer,
}: {
  version: ContentVersion;
  writer: StudioWrite;
}) {
  const test = useCapiroMutation("workspace.blueprints.test");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] =
    useState<
      Extract<
        ReturnType<typeof parseWorkspaceBlueprintSampleTest>,
        { ok: true }
      >["value"]
    >();
  const [error, setError] = useState<string>();
  return (
    <details className={styles.group}>
      <summary>Test saved draft</summary>
      <form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault();
          setResult(undefined);
          setError(undefined);
          const params = {
            blueprintId: version.blueprintId,
            versionId: version.id,
          };
          void test
            .run({ params, body: { answers } })
            .then((raw) => {
              const parsed = parseWorkspaceBlueprintSampleTest(raw, {
                ...params,
                definitionHash: version.definitionHash,
              });
              if (!parsed.ok)
                throw new Error(
                  "The test did not match this saved version. Refresh and test again.",
                );
              setResult(parsed.value);
            })
            .catch((caught: unknown) =>
              setError(
                caught instanceof Error
                  ? caught.message
                  : "The sample test failed.",
              ),
            );
        }}
      >
        <p>
          Simulates intake and an outline from the saved draft. No document is
          created. Publishing runs its own check with empty answers.
        </p>
        <StudioJson
          label="Sample answers by question identifier (JSON)"
          value={answers}
          objectOnly
          onChange={(value) => setAnswers(value as Record<string, unknown>)}
        />
        <ActionButton type="submit" disabled={test.pending || writer.locked}>
          Run sample test
        </ActionButton>
        {error && <p role="alert">{error}</p>}
        {result && (
          <div role="status">
            <p>Sample test passed for this saved draft.</p>
            <ol>
              {result.outline.map((section) => (
                <li key={section.id}>
                  {section.title} · {section.targetWords.min}–
                  {section.targetWords.max} words
                </li>
              ))}
            </ol>
            <pre>{JSON.stringify(result.intake, null, 2)}</pre>
          </div>
        )}
      </form>
    </details>
  );
}

export function BlueprintContent({
  blueprint,
  raw,
  versionId,
  writer,
  onChanged,
}: {
  blueprint: WorkspaceBlueprintDetail;
  raw: unknown;
  versionId: string;
  writer: StudioWrite;
  onChanged: (id: string) => void;
}) {
  const parsed = parseWorkspaceBlueprintContentVersion(raw, {
    blueprintId: blueprint.id,
    versionId,
  });
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "retire">();
  if (!parsed.ok)
    return <p role="alert">Could not read this version’s definition.</p>;
  const version = parsed.value;
  const definition = parseWorkspaceBlueprintDefinition(version.definition);
  const changeStatus = () => {
    if (!confirm) return;
    const operation =
      confirm === "publish"
        ? "workspace.blueprints.publish"
        : "workspace.blueprints.retire";
    const status = confirm === "publish" ? "published" : "retired";
    void writer.run(
      confirm === "publish" ? "Publish blueprint" : "Retire blueprint",
      async (send, signal) => {
        const params = { blueprintId: blueprint.id, versionId };
        assertUnchanged(
          version,
          await readBlueprintContent(writer, params, signal),
        );
        const receipt = parseWorkspaceBlueprintContentVersion(
          await send(() =>
            writer.api.request(
              operation,
              {
                params,
                body: { expectedDefinitionHash: version.definitionHash },
              },
              { signal },
            ),
          ),
          params,
        );
        if (
          !receipt.ok ||
          receipt.value.status !== status ||
          !sameStudioValue(receipt.value.definition, version.definition) ||
          receipt.value.definitionHash !== version.definitionHash
        )
          throw new Error("Version status was not confirmed.");
        assertUnchanged(
          receipt.value,
          await readBlueprintContent(writer, params, signal),
        );
        if (!signal.aborted) {
          setConfirm(undefined);
          onChanged(versionId);
        }
      },
    );
  };
  return (
    <div className={styles.read}>
      <div className={styles.actions}>
        {version.status === "draft" && (
          <>
            <ActionButton
              disabled={writer.locked}
              onClick={() => setEditing(true)}
            >
              Edit definition
            </ActionButton>
            <ActionButton
              disabled={writer.locked || !definition.ok}
              onClick={() => setConfirm("publish")}
            >
              Publish version {version.version}
            </ActionButton>
          </>
        )}
        {version.status === "published" && (
          <ActionButton
            disabled={writer.locked}
            onClick={() => setConfirm("retire")}
          >
            Retire version {version.version}
          </ActionButton>
        )}
        <ActionButton
          disabled={writer.locked}
          onClick={() =>
            void writer.run("Clone version", async (send, signal) => {
              const params = { blueprintId: blueprint.id };
              assertUnchanged(
                version,
                await readBlueprintContent(
                  writer,
                  { ...params, versionId },
                  signal,
                ),
              );
              const receipt = parseWorkspaceBlueprintContentVersion(
                await send(() =>
                  writer.api.request(
                    "workspace.blueprints.cloneVersion",
                    {
                      params,
                      body: {
                        fromVersionId: version.id,
                        expectedDefinitionHash: version.definitionHash,
                      },
                    },
                    { signal },
                  ),
                ),
                params,
              );
              if (
                !receipt.ok ||
                receipt.value.id === version.id ||
                receipt.value.status !== "draft" ||
                !sameStudioValue(receipt.value.definition, version.definition)
              )
                throw new Error("Cloned version could not be confirmed.");
              assertUnchanged(
                receipt.value,
                await readBlueprintContent(
                  writer,
                  { ...params, versionId: receipt.value.id },
                  signal,
                ),
              );
              if (!signal.aborted) onChanged(receipt.value.id);
            })
          }
        >
          Clone selected version
        </ActionButton>
      </div>
      {definition.ok ? (
        <DefinitionRead value={definition.value} />
      ) : (
        <p>
          This version’s definition is incomplete.{" "}
          {version.status === "draft"
            ? "Edit it before testing or publishing."
            : "Clone it to a draft version before editing."}
        </p>
      )}
      {version.status === "draft" && (
        <BlueprintSampleTest
          key={version.definitionHash}
          version={version}
          writer={writer}
        />
      )}
      {editing && (
        <BlueprintDraftEditor
          key={version.id + version.definitionHash}
          blueprint={blueprint}
          version={version}
          writer={writer}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
        />
      )}
      {confirm && (
        <Modal
          open
          title={`${confirm === "publish" ? "Publish" : "Retire"} blueprint v${version.version}`}
          onOpenChange={(open) => {
            if (!open && writer.phase !== "pending") setConfirm(undefined);
          }}
          closeDisabled={writer.phase === "pending"}
        >
          <div className={styles.fields}>
            <p>
              {confirm === "publish"
                ? "Publish this saved definition for new documents. It cannot be edited after publication."
                : "Retire this version from new document selection. Existing documents keep their saved pin."}
            </p>
            <ActionButton
              primary
              disabled={writer.locked}
              onClick={changeStatus}
            >
              Confirm {confirm}
            </ActionButton>
            {writer.message && <p role="status">{writer.message}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
