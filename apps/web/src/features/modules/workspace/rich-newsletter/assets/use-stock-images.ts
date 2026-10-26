"use client";
import { useEffect, useRef, useState } from "react";
import {
  parseNewsletterStockPage,
  type NewsletterStockImage,
  type NewsletterStockImport,
} from "@capiro/shared/newsletter";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  richNewsletterStockOperations,
  type StockSearchQuery,
} from "../../../../../shared/capiro/operations/rich-newsletter-stock";
import { boundAssetDetails } from "./use-asset-picker";

type ImportState = {
  phase: "idle" | "pending" | "proposed" | "unknown";
  source?: NewsletterStockImage;
  item?: NewsletterStockImport;
};
/** Read replacement stays with useCapiroQuery; import uncertainty survives dialog close. */
export function useStockImages(open: boolean) {
  const [query, setQuery] = useState<StockSearchQuery>();
  const [selected, setSelected] = useState<NewsletterStockImage>();
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const [error, setError] = useState<string>();
  const mutation = useCapiroMutation("workspace.richNewsletter.stock.import");
  const mounted = useRef(false),
    active = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const status = useCapiroQuery(
    "workspace.richNewsletter.stock.status",
    {},
    { enabled: open },
  );
  const search = useCapiroQuery(
    "workspace.richNewsletter.stock.search",
    { query: query ?? { search: "", page: 1 } },
    {
      enabled: open && !!query && status.data?.available === true,
    },
  );
  const received =
    query && search.data !== undefined
      ? parseNewsletterStockPage(search.data, { page: query.page })
      : undefined;
  const detail = useCapiroQuery(
    "workspace.richNewsletter.assets.detail",
    { params: { id: state.item?.id ?? "" } },
    {
      enabled: open && state.phase === "proposed" && !!state.item,
    },
  );
  const admitted =
    state.item && detail.data !== undefined
      ? boundAssetDetails(detail.data, state.item.id)
      : undefined;
  const blocked = state.phase === "pending" || state.phase === "unknown";
  const load = (next: StockSearchQuery) => {
    setSelected(undefined);
    setQuery(next);
    search.reload();
  };
  const importImage = async () => {
    if (
      !selected ||
      active.current ||
      blocked ||
      state.phase === "proposed" ||
      !status.data?.available
    )
      return;
    const input = richNewsletterStockOperations[
      "workspace.richNewsletter.stock.import"
    ].request.safeParse({ params: { id: String(selected.id) }, body: {} });
    if (!input.success) {
      setError("This photo cannot be imported by the current service.");
      return;
    }
    const source = selected;
    active.current = true;
    setError(undefined);
    setState({ phase: "pending", source });
    try {
      const item = await mutation.run(input.data);
      if (mounted.current) setState({ phase: "proposed", source, item });
    } catch {
      if (mounted.current) setState({ phase: "unknown", source });
    } finally {
      active.current = false;
    }
  };
  return {
    status,
    search,
    query,
    selected,
    state,
    blocked,
    error,
    detail,
    results: received?.ok ? received.value : undefined,
    invalidPage: !!received && !received.ok,
    details: admitted?.ok ? admitted.value : undefined,
    invalidDetail: !!admitted && !admitted.ok,
    load,
    importImage,
    select: (photo?: NewsletterStockImage) => {
      if (!blocked) {
        setSelected(photo);
        setError(undefined);
      }
    },
    clearSearch: () => {
      setQuery(undefined);
      setSelected(undefined);
    },
    reviewAnother: () => {
      if (!blocked) {
        setState({ phase: "idle" });
        setSelected(undefined);
      }
    },
  };
}
export type StockImagesState = ReturnType<typeof useStockImages>;
