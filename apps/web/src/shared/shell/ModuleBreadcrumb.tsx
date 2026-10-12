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
    </nav>
  );
}
