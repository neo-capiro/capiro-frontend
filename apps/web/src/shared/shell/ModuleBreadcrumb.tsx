"use client";

import { ScopedLink } from "./ScopedLink";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectInput } from "../module-ui";
import { moduleCatalog, moduleHref, type ModuleSlug } from "./module-catalog";
import styles from "./module-shell.module.css";

export function ModuleBreadcrumb({ active }: { active: ModuleSlug }) {
  const router = useRouter();
  const selected = useSelectedClient();
  const params = useSearchParams();
  if (active === "intelligence" && params.get("view") === "legiwatch")
    return null;
  // Figma 3.4 shows the active view as a trailing crumb
  // (Modules / [Intelligence ▾] / District Nexus). Resolved from the catalog so
  // no module has to hard-code its own crumb.
  const view = params.get("view");
  const chip = view
    ? moduleCatalog
        .find((descriptor) => descriptor.slug === active)
        ?.chips.find((candidate) => candidate.view === view)
    : undefined;
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ScopedLink href="/modules">← Modules</ScopedLink>
      <span aria-hidden="true">/</span>
      <SelectInput
        value={active}
        aria-label="Switch module"
        options={moduleCatalog.map((descriptor) => ({
          value: descriptor.slug,
          label: descriptor.label,
        }))}
        onValueChange={(value) => {
          const descriptor = moduleCatalog.find(
            (candidate) => candidate.slug === value,
          );
          if (descriptor)
            router.push(
              scopedHref(
                moduleHref(descriptor.slug),
                selected.state === "authorized-client"
                  ? selected.client.id
                  : undefined,
              ),
            );
        }}
      />
      {chip && (
        <>
          <span aria-hidden="true">/</span>
          <span>{chip.label}</span>
        </>
      )}
    </nav>
  );
}
