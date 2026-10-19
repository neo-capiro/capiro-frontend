"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref, type ProductMode } from "../session/client-route";
export function ModeLink({
  mode,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { mode: ProductMode }) {
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
  return <Link {...props} href={productHref(mode, clientId)} />;
}
