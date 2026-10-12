"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectInput } from "../module-ui";
import { moduleCatalog, moduleHref, type ModuleSlug } from "./module-catalog";
import styles from "./module-shell.module.css";

export function ModuleBreadcrumb({ active }: { active: ModuleSlug }) {
  const router = useRouter();
  const params = useSearchParams();
  if (active === "intelligence" && params.get("view") === "legiwatch")
    return null;
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/modules">← Modules</Link>
      <span aria-hidden="true">/</span>
      <SelectInput
        value={active}
        aria-label="Switch module"
        options={moduleCatalog.map((module) => ({
          value: module.slug,
          label: module.label,
        }))}
        onValueChange={(value) => {
          const module = moduleCatalog.find(
            (candidate) => candidate.slug === value,
          );
          if (module) router.push(moduleHref(module.slug));
        }}
      />
    </nav>
  );
}
