"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  comparisonSelection,
  type SavedComparison,
} from "../../../../shared/capiro/operations/research-comparisons";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { ComparisonEditor } from "./ComparisonEditor";
import { SavedComparisonView } from "./SavedComparisonView";
import { comparisonHref } from "./comparison-state";
import styles from "../research.module.css";

export function ResearchComparisons({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const search = useSearchParams(),
    router = useRouter();
  const id = search.get("comparisonId") ?? "",
    versionId = search.get("comparisonVersionId") ?? "";
  const validId = z.uuid().safeParse(id).success,
    validVersion = !versionId || z.uuid().safeParse(versionId).success;
  const [includeArchived, setIncludeArchived] = useState(false);
  const [versionInput, setVersionInput] = useState("");
  const [editing, setEditing] = useState<string>();
  const list = useCapiroQuery("research.comparisons.list", {
    query: { includeArchived },
  });
  const current = useCapiroQuery(
    "research.comparisons.read",
    { params: { id } },
    { enabled: validId && !versionId },
  );
  const historical = useCapiroQuery(
    "research.comparisons.version",
    { params: { id, versionId } },
    { enabled: validId && !!versionId && validVersion },
  );
  const read = versionId ? historical : current;
  const comparison = read.data;
  const scoped =
    comparison &&
    (comparison.portfolioId === null || comparison.portfolioId === portfolio.id)
      ? comparison
      : undefined;
  let selected = scoped?.currentVersion.selection ?? {
    mode: "explicit" as const,
    subjectKeys: [],
    passageIds: [],
  };
  let selectionError = false;
  const rawSelection = search.get("comparisonSelection");
  if (rawSelection && scoped) {
    try {
      const parsed = comparisonSelection.parse(JSON.parse(rawSelection));
      if (
        parsed.subjectKeys.some((key) => !selected.subjectKeys.includes(key)) ||
        parsed.passageIds.some((key) => !selected.passageIds.includes(key))
      )
        throw new Error("Selection is outside this capture");
      selected = parsed;
    } catch {
      selectionError = true;
    }
  }
  function opened(saved: SavedComparison) {
    list.reload();
    read.reload();
    setEditing(undefined);
    router.push(
      comparisonHref(
        search.toString(),
        portfolio.id,
        saved.id,
        saved.currentVersion.id,
      ),
      { scroll: false },
    );
  }
  const rows = list.data?.filter(
    (item) => item.portfolioId === null || item.portfolioId === portfolio.id,
  );
  return (
    <div className={styles.stack}>
      <Panel
        title="Saved Research comparisons"
        description="Personal immutable captures for this portfolio and your unattached comparisons. The service returns up to 50 recent comparisons."
      >
        <div className={styles.content}>
          <label>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />{" "}
            Include archived comparisons
          </label>
          <StatusPanel
            loading={list.loading}
            error={list.error}
            onRetry={list.reload}
            empty={
              rows?.length === 0
                ? "No saved comparisons. Choose subjects below to create the first capture."
                : undefined
            }
          >
            <ul>
              {rows?.map((item) => (
                <li key={item.id}>
                  <Link
                    href={comparisonHref(
                      search.toString(),
                      portfolio.id,
                      item.id,
                      item.currentVersion.id,
                    )}
                  >
                    {item.name} — version {item.currentVersion.version}
                    {item.archivedAt ? " (archived)" : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </StatusPanel>
          <div className={styles.toolbar}>
            <Link href={comparisonHref(search.toString(), portfolio.id)}>
              New comparison
            </Link>
            {id && (
              <Link href={comparisonHref(search.toString(), portfolio.id, id)}>
                Open current version
              </Link>
            )}
          </div>
          {validId && (
            <Field
              label="Open an exact saved version"
              htmlFor="comparison-version"
              description="Use the version identifier from a saved comparison link. Historical versions are never inferred from a number."
            >
              <div className={styles.toolbar}>
                <TextInput
                  id="comparison-version"
                  value={versionInput}
                  onChange={(event) => setVersionInput(event.target.value)}
                />
                <ActionButton
                  disabled={!z.uuid().safeParse(versionInput).success}
                  onClick={() =>
                    router.push(
                      comparisonHref(
                        search.toString(),
                        portfolio.id,
                        id,
                        versionInput,
                      ),
                      { scroll: false },
                    )
                  }
                >
                  Open version
                </ActionButton>
              </div>
            </Field>
          )}
        </div>
      </Panel>
      {id && (!validId || !validVersion) ? (
        <StatusPanel error="The comparison or version identifier is invalid." />
      ) : id ? (
        <StatusPanel
          loading={read.loading}
          error={read.error}
          onRetry={read.reload}
        >
          {comparison && !scoped && (
            <StatusPanel error="This comparison belongs to a different Research Portfolio." />
          )}
          {scoped &&
            (selectionError ? (
              <StatusPanel error="The selected items do not belong to this saved capture. Open the current version to reset the selection." />
            ) : (
              <SavedComparisonView
                key={`${scoped.id}:${scoped.currentVersion.id}:${scoped.revision}`}
                comparison={scoped}
                portfolio={portfolio}
                selection={selected}
                onSelection={(selection) =>
                  router.replace(
                    comparisonHref(
                      search.toString(),
                      portfolio.id,
                      scoped.id,
                      scoped.currentVersion.id,
                      selection,
                    ),
                    { scroll: false },
                  )
                }
                onSaved={opened}
                onReload={onReload}
                onRevise={() =>
                  setEditing(`${scoped.id}:${scoped.currentVersion.id}`)
                }
              />
            ))}
          {scoped && editing === `${scoped.id}:${scoped.currentVersion.id}` && (
            <ComparisonEditor
              key={`edit:${scoped.id}:${scoped.currentVersion.id}`}
              portfolio={portfolio}
              existing={scoped}
              onSaved={opened}
            />
          )}
        </StatusPanel>
      ) : portfolio.myRole !== "viewer" && portfolio.lifecycle === "active" ? (
        <ComparisonEditor
          key={portfolio.id}
          portfolio={portfolio}
          onSaved={opened}
        />
      ) : (
        <p>
          A current editor or owner grant on an active portfolio is required to
          save an attached comparison.
        </p>
      )}
    </div>
  );
}
