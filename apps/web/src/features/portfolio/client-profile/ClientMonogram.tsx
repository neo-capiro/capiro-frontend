"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { organizationInitials } from "@/features/portfolio/index/public";

/**
 * Client monogram: the logo when it resolves, the client's initials when it does
 * not.
 *
 * A client can carry a `logoUrl` that no longer resolves (a revoked upload, a
 * rotated bucket object). Rendering the <img> unconditionally left a
 * broken-image box in the identity card and the profile strip, so a load
 * failure falls back to exactly the same initials the no-logo case already
 * uses. The caller keeps its own wrapper element and styling; this renders only
 * the contents.
 */
export function ClientMonogram({
  name,
  logoUrl,
  size,
}: {
  name: string;
  logoUrl?: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return <>{organizationInitials(name)}</>;
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
