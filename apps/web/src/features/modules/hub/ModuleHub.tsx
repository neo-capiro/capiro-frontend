"use client";

import Link from "next/link";
import { useState } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { Tooltip, TooltipTrigger } from "@capiro/ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { PageHeader } from "../../../shared/module-ui";
import {
  moduleCatalog,
  moduleHref,
  type ModuleDescriptor,
} from "../../../shared/shell/module-catalog";
import { ModuleAsset } from "../../../shared/shell/ModuleAsset";
import styles from "./hub.module.css";

function ModuleCard({
  module,
  clientId,
}: {
  module: ModuleDescriptor;
  clientId: string;
}) {
  const href = (view?: string) =>
    `${moduleHref(module.slug, view)}${clientId ? `${view ? "&" : "?"}clientId=${encodeURIComponent(clientId)}` : ""}`;
  return (
    <article
      className={`${styles.card} ${module.slug === "intelligence" ? styles.wideCard : ""}`}
    >
      <div className={styles.cardTop}>
        <Link className={styles.cardHeading} href={href()}>
          <span
            className={`${styles.cardIcon} ${styles[module.tone ?? "steel"]}`}
          >
            <ModuleAsset name={module.cardIcon ?? module.icon} />
          </span>
          <h2>
            {module.slug === "research-portfolios"
              ? "Research Portfolios"
              : module.label}
          </h2>
        </Link>
        <p className={styles.description}>{module.description}</p>
        <div className={styles.chips}>
          {module.chips.map((chip) => (
            <Link key={chip.view} href={href(chip.view)}>
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
      <div className={styles.cardBottom}>
        <div className={styles.profile}>
          <span>In a client profile</span>
          <p>{module.profile}</p>
        </div>
        <Link
          href={href()}
          className={`${styles.open} ${module.slug === "engagement" ? styles.primaryOpen : ""}`}
        >
          {module.slug === "engagement" ? "Open Engagement" : "Open"}
        </Link>
      </div>
    </article>
  );
}

export function ModuleHub({
  previewCoreReadOnly = false,
}: {
  previewCoreReadOnly?: boolean;
}) {
  const clients = useCapiroQuery("clients.list", {
    query: { includeArchived: false },
  });
  const router = useRouter();
  const params = useSearchParams();
  const clientId = params.get("clientId") ?? "";
  const setClientId = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("clientId", id);
    else next.delete("clientId");
    router.push(`/modules?${next}`);
  };
  const profiles = clients.error ? [] : (clients.data ?? []);
  const clientsLoading = clients.loading;
  const clientsError = clients.error;
  const workOrder = ["engagement", "workspace", "planner", "strategies"];
  const work = moduleCatalog
    .filter((module) => module.group === "work")
    .sort((a, b) => workOrder.indexOf(a.slug) - workOrder.indexOf(b.slug));
  const landscape = [
    "intelligence",
    "directory",
    "research-portfolios",
  ].flatMap((slug) => moduleCatalog.filter((module) => module.slug === slug));
  return (
    <div
      className={styles.hub}
      data-design-target={previewCoreReadOnly ? undefined : "1064:191436"}
    >
      <PageHeader
        title={
          previewCoreReadOnly ? (
            "Modules client scope"
          ) : (
            <>
              Everything in Capiro
              <span className={styles.desktopTitle}>
                , across the whole firm
              </span>
            </>
          )
        }
        eyebrow={previewCoreReadOnly ? "Read-only preview" : "Modules"}
        titleAccessory={
          previewCoreReadOnly ? undefined : <ModuleHubInformation />
        }
        actions={
          previewCoreReadOnly ? undefined : (
            <label className={styles.scope}>
              Scope
              <select
                aria-label="Client profile scope"
                value={clientId}
                disabled={clientsLoading || Boolean(clientsError)}
                onChange={(event) => setClientId(event.target.value)}
              >
                <option value="">
                  {profiles.length
                    ? `All ${profiles.length} available profile${profiles.length === 1 ? "" : "s"}`
                    : "All available profiles"}
                </option>
                {profiles.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />
      {previewCoreReadOnly && clientsLoading && (
        <p role="status">Loading available client profiles…</p>
      )}
      {clientsError && (
        <p className={styles.scopeError} role="alert">
          Client scope could not be loaded.{" "}
          <button type="button" onClick={clients.reload}>
            Try again
          </button>
        </p>
      )}
      {previewCoreReadOnly &&
        !clientsLoading &&
        !clientsError &&
        profiles.length === 0 && (
          <p role="status">No available client profiles were returned.</p>
        )}
      {previewCoreReadOnly ? (
        <section
          className={styles.relationship}
          aria-label="Preview availability"
        >
          <div>
            <h2>Available client profiles</h2>
            <p>
              Client selection, module records, and actions are unavailable in
              this preview.
            </p>
            {profiles.length > 0 && (
              <ul aria-label="Available client profiles">
                {profiles.map((client) => (
                  <li key={client.id}>{client.name}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <>
          <ModulesRelationship />
          <ModuleGroup
            id="run-work"
            title="Run the work"
            modules={work}
            clientId={clientId}
          />
          <ModuleGroup
            id="know-landscape"
            title="Know the landscape"
            modules={landscape}
            clientId={clientId}
            landscape
          />
        </>
      )}
    </div>
  );
}

function ModuleHubInformation() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.infoAnchor} ref={setContainer}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={styles.info}
            aria-label="About Modules"
            onClick={(event) => {
              // Keep activation available when the adopted trigger would close.
              event.preventDefault();
              setOpen(true);
            }}
          >
            <span aria-hidden="true">i</span>
          </button>
        </TooltipTrigger>
        {container && (
          <TooltipPrimitive.Portal container={container}>
            <TooltipPrimitive.Content
              side="bottom"
              sideOffset={4}
              className={styles.infoContent}
              data-slot="tooltip-content"
            >
              Every client and every activity available to your account. Choose
              a client profile to show just that client’s work.
              <TooltipPrimitive.Arrow />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </Tooltip>
    </div>
  );
}

function ModulesRelationship() {
  return (
    <section
      className={styles.relationship}
      aria-label="How modules and profiles relate"
    >
      <div>
        <h2>Modules · the whole firm</h2>
        <p>
          Explore the modules and records available to your account, across the
          firm.
        </p>
      </div>
      <span aria-hidden="true">→</span>
      <div>
        <h2>Client profile · just that client</h2>
        <p>
          Open modules with that client selected. Available records depend on
          your access in each module.
        </p>
      </div>
    </section>
  );
}

function ModuleGroup({
  id,
  title,
  modules,
  clientId,
  landscape = false,
}: {
  id: string;
  title: string;
  modules: readonly ModuleDescriptor[];
  clientId: string;
  landscape?: boolean;
}) {
  return (
    <section className={styles.group} aria-labelledby={id}>
      <h2 id={id} className={styles.eyebrow}>
        {title}
      </h2>
      <div className={landscape ? styles.landscapeGrid : styles.workGrid}>
        {modules.map((module) => (
          <ModuleCard key={module.slug} module={module} clientId={clientId} />
        ))}
      </div>
    </section>
  );
}
