"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
  Tabs,
} from "../../../../shared/module-ui";
import { BlueprintDetail } from "./BlueprintDetail";
import { BlueprintStatus } from "./BlueprintVersions";
import { BlueprintAdoption, useBlueprintAdoption } from "./BlueprintAdoption";
import styles from "./document-templates.module.css";
import { BlueprintCreate } from "./BlueprintCreate";
import { useStudioWrite } from "./studio-write";
import { ThemeStudio } from "./ThemeStudio";
import { BrandAssetStudio } from "./BrandAssetStudio";

export function DocumentTemplateLibrary({
  clientId,
  onClose,
  onCreated,
}: {
  clientId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const query = useCapiroQuery("workspace.blueprints.list", {});
  const [product, setProduct] = useState("");
  const [selectedId, select] = useState<string>();
  const [createdVersionId, setCreatedVersionId] = useState<string>();
  const adoption = useBlueprintAdoption(clientId, onCreated);
  const writer = useStudioWrite();
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("blueprints");
  const items = query.data ?? [];
  const products = [...new Set(items.map((row) => row.product))];
  const filtered = product
    ? items.filter((row) => row.product === product)
    : items;
  const selected = filtered.find((row) => row.id === selectedId);
  const refresh = () => {
    select(undefined);
    setCreatedVersionId(undefined);
    setProduct("");
    query.reload();
  };
  return (
    <section className={styles.screen} data-design-node="1064:261139">
      <PageHeader
        title="Document blueprints"
        eyebrow="Workspace"
        description="Explore saved versions and choose a published version for a new document."
        actions={
          <>
            <ActionButton onClick={onClose}>← Documents</ActionButton>
            <ActionButton onClick={refresh}>Refresh catalog</ActionButton>
            <ActionButton
              primary
              disabled={writer.locked}
              onClick={() => setCreating(true)}
            >
              New blueprint
            </ActionButton>
          </>
        }
      />
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
      <Tabs
        label="Document studio"
        value={tab}
        onChange={setTab}
        items={[
          { id: "blueprints", label: "Blueprints" },
          { id: "themes", label: "Themes" },
          { id: "assets", label: "Brand assets" },
        ]}
      />
      {tab === "themes" && <ThemeStudio writer={writer} />}
      {tab === "assets" && <BrandAssetStudio writer={writer} />}
      {tab === "blueprints" && (
        <>
          {query.loading && <p role="status">Loading document blueprints…</p>}
          <StatusPanel
            error={
              query.error ? "Could not load document blueprints." : undefined
            }
            onRetry={refresh}
          />
          {query.data && !items.length && (
            <div className={styles.message}>
              <h2>No document blueprints available.</h2>
              <p>Refresh the catalog to check again.</p>
            </div>
          )}
          {items.length > 0 && (
            <div className={styles.columns}>
              <aside
                className={styles.catalog}
                aria-label="Document blueprint catalog"
                data-design-node="1064:261160"
              >
                <div
                  className={styles.filters}
                  role="group"
                  aria-label="Filter document blueprints by product"
                >
                  {["", ...products].map((value) => (
                    <ActionButton
                      key={value}
                      className={styles.filter}
                      primary={product === value}
                      aria-pressed={product === value}
                      onClick={() => {
                        setProduct(value);
                        select(undefined);
                        setCreatedVersionId(undefined);
                      }}
                    >
                      {value || `All · ${items.length}`}
                    </ActionButton>
                  ))}
                </div>
                {!filtered.length && (
                  <p>No document blueprints match this product.</p>
                )}
                {filtered.map((row) => {
                  const latest = row.versions[0];
                  return (
                    <button
                      type="button"
                      className={styles.catalogItem}
                      key={row.id}
                      aria-pressed={selectedId === row.id}
                      onClick={() => {
                        setCreatedVersionId(undefined);
                        select(row.id);
                      }}
                    >
                      <span>
                        <strong>{row.name}</strong>
                        <span className={styles.caption}>
                          {row.product} ·{" "}
                          {row.scope === "firm" ? "Firm" : "Capiro"}
                        </span>
                        <span className={styles.caption}>
                          {latest ? `Latest v${latest.version}` : "No versions"}{" "}
                          · {row.pinnedDocCount} documents pinned
                        </span>
                      </span>
                      {latest && <BlueprintStatus status={latest.status} />}
                    </button>
                  );
                })}
              </aside>
              {selected ? (
                <BlueprintDetail
                  key={selected.id}
                  id={selected.id}
                  onAdopt={adoption.begin}
                  writer={writer}
                  initialVersionId={createdVersionId}
                  onVersionChanged={(id) => {
                    setCreatedVersionId(id);
                    query.reload();
                  }}
                />
              ) : (
                <div className={styles.detail}>
                  <div className={styles.message}>
                    <h2>Choose a document blueprint</h2>
                    <p>Select a blueprint to inspect its saved versions.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <BlueprintAdoption adoption={adoption} onDocuments={onClose} />
      {creating && (
        <BlueprintCreate
          writer={writer}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setProduct("");
            setCreatedVersionId(undefined);
            setTab("blueprints");
            select(id);
            query.reload();
          }}
        />
      )}
    </section>
  );
}
