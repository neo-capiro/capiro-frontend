"use client";
import { useState } from "react";
import {
  parseWorkspaceBlueprintDetail,
  parseWorkspaceBlueprintVersion,
  type WorkspaceBlueprintDetail,
  type WorkspaceBlueprintVersionMetadata,
} from "@capiro/shared/workspace-template-studio";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  SelectInput,
  StatusPanel,
} from "../../../../shared/module-ui";
import {
  BlueprintHistory,
  BlueprintStatus,
  blueprintDate,
} from "./BlueprintVersions";
import styles from "./document-templates.module.css";

export function BlueprintDetail({
  id,
  onAdopt,
}: {
  id: string;
  onAdopt: (
    blueprint: WorkspaceBlueprintDetail,
    version: WorkspaceBlueprintVersionMetadata,
  ) => void;
}) {
  const query = useCapiroQuery("workspace.blueprints.detail", {
    params: { blueprintId: id },
  });
  const received =
    query.data === undefined
      ? undefined
      : parseWorkspaceBlueprintDetail(query.data, { blueprintId: id });
  const blueprint = received?.ok ? received.value : undefined;
  const [versionId, selectVersion] = useState("");
  const [history, setHistory] = useState(false);
  const listed =
    blueprint?.versions.some((version) => version.id === versionId) ?? false;
  const versionQuery = useCapiroQuery(
    "workspace.blueprints.version",
    { params: { blueprintId: id, versionId } },
    { enabled: listed },
  );
  const saved =
    versionQuery.data === undefined
      ? undefined
      : parseWorkspaceBlueprintVersion(versionQuery.data, {
          blueprintId: id,
          versionId,
        });
  const version = listed && saved?.ok ? saved.value : undefined;
  const refresh = () => {
    selectVersion("");
    setHistory(false);
    query.reload();
  };
  return (
    <section
      className={styles.detail}
      aria-label="Blueprint details"
      data-design-node="1064:261199"
    >
      {query.loading && (
        <p className={styles.message} role="status">
          Loading this blueprint…
        </p>
      )}
      <StatusPanel
        error={
          query.error || (received && !received.ok)
            ? "Could not load this blueprint."
            : undefined
        }
        onRetry={refresh}
      />
      {blueprint && (
        <>
          <header
            className={styles.detailHeader}
            data-design-node="1064:261200"
          >
            <div>
              <h2>{blueprint.name}</h2>
              <p>
                {blueprint.product} ·{" "}
                {blueprint.scope === "firm" ? "Firm" : "Capiro"}
              </p>
            </div>
            <ActionButton
              onClick={() => setHistory(true)}
              disabled={!blueprint.versions.length}
            >
              Version history
            </ActionButton>
          </header>
          <div className={styles.detailBody}>
            <div className={styles.mainFacts}>
              {blueprint.description && <p>{blueprint.description}</p>}
              {blueprint.versions.length ? (
                <Field label="Saved version" htmlFor="blueprint-version">
                  <SelectInput
                    id="blueprint-version"
                    value={listed ? versionId : ""}
                    onValueChange={selectVersion}
                    placeholder="Choose a saved version"
                    options={blueprint.versions.map((row) => ({
                      value: row.id,
                      label: `v${row.version} · ${row.status}`,
                    }))}
                  />
                </Field>
              ) : (
                <p>No saved versions are available.</p>
              )}
              {versionQuery.loading && (
                <p role="status">Loading selected version…</p>
              )}
              <StatusPanel
                error={
                  versionQuery.error || (saved && !saved.ok)
                    ? "Could not load this saved version."
                    : undefined
                }
                onRetry={versionQuery.reload}
              />
              {version && (
                <section
                  className={styles.versionFacts}
                  aria-label={`Selected version ${version.version}`}
                >
                  <div className={styles.actions}>
                    <h3>Version {version.version}</h3>
                    <BlueprintStatus status={version.status} />
                  </div>
                  <dl>
                    <dt>Created</dt>
                    <dd>{blueprintDate(version.createdAt)}</dd>
                    {version.publishedAt && (
                      <>
                        <dt>Published</dt>
                        <dd>{blueprintDate(version.publishedAt)}</dd>
                      </>
                    )}
                    {version.retiredAt && (
                      <>
                        <dt>Retired</dt>
                        <dd>{blueprintDate(version.retiredAt)}</dd>
                      </>
                    )}
                  </dl>
                  <p>
                    {version.status === "published"
                      ? "Create a blank document pinned to this saved version. Future blueprint versions will not change its pin."
                      : "Choose a published version to create a document. Draft and retired versions remain available to inspect."}
                  </p>
                  {version.status === "published" && (
                    <ActionButton
                      primary
                      onClick={() => onAdopt(blueprint, version)}
                    >
                      Use version {version.version}
                    </ActionButton>
                  )}
                </section>
              )}
            </div>
            <aside className={styles.sideFacts}>
              <h3>About this blueprint</h3>
              <dl>
                <dt>Scope</dt>
                <dd>{blueprint.scope === "firm" ? "Firm" : "Capiro"}</dd>
                <dt>Product</dt>
                <dd>{blueprint.product}</dd>
                <dt>Versions</dt>
                <dd>{blueprint.versions.length}</dd>
              </dl>
              <p>
                This view shows saved version details. Document content and
                theme previews are not available here.
              </p>
              <ActionButton onClick={refresh}>Refresh blueprint</ActionButton>
            </aside>
          </div>
          {history && (
            <BlueprintHistory
              blueprint={blueprint}
              onClose={() => setHistory(false)}
              onSelect={(id) => {
                selectVersion(id);
                setHistory(false);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
