"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
/** Preserve the verified selection hint between client-aware shared destinations. */
export function ScopedLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const selected = useSelectedClient();
  return (
    <Link
      {...props}
      href={scopedHref(
        href,
        selected.state === "authorized-client" ? selected.client.id : undefined,
      )}
    />
  );
}
