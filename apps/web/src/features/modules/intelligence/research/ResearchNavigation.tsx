"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ActionButton } from "../../../../shared/module-ui";
import type { z } from "zod";
import type { evidence } from "../../../../shared/capiro/operations/defense-research-schemas";

export function useResearchLocation() {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const rawPage = Number(params.get("researchPage") || 1);
  return {
    params,
    update,
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}
export function SourceLink({
  url,
  children = "Open source",
}: {
  url: string | null;
  children?: ReactNode;
}) {
  let safe = false;
  try {
    safe = Boolean(url && ["https:", "http:"].includes(new URL(url).protocol));
  } catch {
    /* Unavailable source link. */
  }
  return safe ? (
    <a href={url!} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <span>Source link unavailable</span>
  );
}
export function EvidenceList({
  items,
}: {
  items: readonly z.infer<typeof evidence>[];
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.evidenceRefId}>
          <SourceLink url={item.sourceUrl}>
            {item.publisher || item.sourceFamily}
          </SourceLink>
          {item.edition && ` · ${item.edition}`}
          {item.nativeLocator.page !== null &&
            ` · page ${item.nativeLocator.page}`}
          {item.nativeLocator.section && ` · ${item.nativeLocator.section}`}
          {item.availability && ` · ${item.availability}`}
          {item.reason && ` — ${item.reason}`}
        </li>
      ))}
    </ul>
  );
}
export function ResearchPages({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav aria-label="Result pages">
      <ActionButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </ActionButton>
      <span>
        {" "}
        Page {page} · {total} matching records{" "}
      </span>
      <ActionButton
        disabled={page * limit >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </ActionButton>
    </nav>
  );
}
