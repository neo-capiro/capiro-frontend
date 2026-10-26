"use client";
import { useState } from "react";
import { parseNewsletterAssetDetails } from "@capiro/shared/newsletter";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import type { AssetListQuery } from "../../../../../shared/capiro/operations/rich-newsletter-assets";

export function boundAssetDetails(value: unknown, requestedId: string) {
  return parseNewsletterAssetDetails(value, { assetId: requestedId });
}

/** The keyed control owns document/block scope; query hooks own read replacement. */
export function useAssetPicker(open: boolean) {
  const [query, setQuery] = useState<AssetListQuery>({
    page: 1,
    pageSize: 25,
    search: "",
    sort: "newest",
  });
  const [selectedId, select] = useState<string>();
  const [showDetails, setShowDetails] = useState(false);
  const list = useCapiroQuery(
    "workspace.richNewsletter.assets.list",
    { query },
    { enabled: open },
  );
  const detail = useCapiroQuery(
    "workspace.richNewsletter.assets.detail",
    { params: { id: selectedId ?? "" } },
    { enabled: open && showDetails && !!selectedId },
  );
  const received =
    selectedId && detail.data !== undefined
      ? boundAssetDetails(detail.data, selectedId)
      : undefined;
  const details = received?.ok ? received.value : undefined;
  const clear = () => {
    select(undefined);
    setShowDetails(false);
  };
  const refresh = () => {
    clear();
    list.reload();
  };
  return {
    query,
    list,
    selectedId,
    showDetails,
    details,
    detailLoading: detail.loading,
    detailError: !!detail.error || (!!received && !received.ok),
    changeQuery: (change: Partial<AssetListQuery>) => {
      clear();
      setQuery((current) => ({ ...current, page: 1, ...change }));
    },
    select: (id: string) => {
      select(id);
      setShowDetails(false);
    },
    viewDetails: () => {
      if (selectedId) setShowDetails(true);
    },
    viewUploaded: (id: string) => {
      select(id);
      setShowDetails(true);
      detail.reload();
    },
    back: () => setShowDetails(false),
    refresh,
    clear,
  };
}
export type AssetPickerState = ReturnType<typeof useAssetPicker>;
