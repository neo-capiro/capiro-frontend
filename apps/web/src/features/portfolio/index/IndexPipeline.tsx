"use client";
import {
  ProspectPipeline,
  useStageCatalog,
  type useProspects,
} from "@/features/portfolio/prospects/public";

export function IndexPipeline({
  data,
  onClose,
  returnTo,
}: {
  data: NonNullable<ReturnType<typeof useProspects>["data"]>;
  onClose: () => void;
  returnTo: string;
}) {
  const catalog = useStageCatalog();
  return (
    <ProspectPipeline
      data={data}
      catalog={catalog.data}
      error={catalog.error}
      onClose={onClose}
      returnTo={returnTo}
    />
  );
}
