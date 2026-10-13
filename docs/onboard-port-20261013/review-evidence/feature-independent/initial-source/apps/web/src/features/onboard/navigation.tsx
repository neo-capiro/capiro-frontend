"use client";

import { useCallback, useEffect } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export { useParams } from "next/navigation";

/** Preserve the funnel's push/replace choices through the shared Next router. */
export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string, options?: { replace?: boolean }) => {
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );
}

export function useLocation() {
  return { pathname: usePathname() };
}

export function useSearchParams() {
  return [useNextSearchParams()] as const;
}

export function Navigate({ to }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return null;
}
