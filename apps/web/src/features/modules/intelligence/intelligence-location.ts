"use client";
import { useRouter, useSearchParams } from "next/navigation";

/** Selection hints only. Each fixed Core operation still authorizes its read. */
export function useIntelligenceLocation() {
  const params = useSearchParams();
  const router = useRouter();
  function update(values: Record<string, string | null>, replace = false) {
    // Read the current URL so consecutive changes never reuse stale render state.
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }
  const rawPage = Number(params.get("page") || "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  return { params, page, update };
}
