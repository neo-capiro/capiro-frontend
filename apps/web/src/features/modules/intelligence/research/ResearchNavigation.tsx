"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "../../../../shared/module-ui";

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
