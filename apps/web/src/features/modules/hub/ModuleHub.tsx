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

export function ModuleHub() {
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
  const profiles = clients.data ?? [];
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
    <div className={styles.hub} data-design-target="411:93787">
      <PageHeader
        title="Everything in Capiro, across the whole firm"
        eyebrow="Modules"
        titleAccessory={<ModuleHubInformation />}
        actions={
          <label className={styles.scope}>
            Scope
            <select
              aria-label="Client profile scope"
              value={clientId}
              disabled={clients.loading || Boolean(clients.error)}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">
                {clients.data
                  ? `All ${profiles.length} client profiles`
                  : "All client profiles"}
              </option>
              {profiles.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        }
      />
      {clients.error && (
        <p className={styles.scopeError} role="alert">
          Client scope could not be loaded.{" "}
          <button type="button" onClick={clients.reload}>
            Try again
          </button>
        </p>
      )}
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
    </div>
  );
}

function ModuleHubInformation() {
  const [container, setContainer] = useState<HTMLSpanElement | null>(null);
  return (
    <span className={styles.infoAnchor} ref={setContainer}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={styles.info}
            aria-label="About Modules"
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
              Every client and every activity, across the whole firm. Choose a
              client profile to show just that client’s work.
              <TooltipPrimitive.Arrow />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </Tooltip>
    </span>
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
          Every client and every activity. Anyone at the firm can browse it,
          even without a client profile.
        </p>
      </div>
      <span aria-hidden="true">→</span>
      <div>
        <h2>Client profile · just that client</h2>
        <p>
          The same data filtered to one client and arranged around their work,
          so you stay fully inside it.
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
