import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CapiroDataProvider } from "@/shared/capiro/CapiroBoundary";

/** Synthetic component harness; production owns these lifetimes in ApplicationBoundary. */
export function PortfolioHarnessProviders({
  children,
}: {
  children: ReactNode;
}) {
  const [expired, setExpired] = useState(false);
  const expire = useCallback(() => setExpired(true), []);
  if (expired)
    return (
      <main className="centered">
        <h1>Your session expired</h1>
        <p>Sign in again to continue.</p>
        <Link className="button primary" href="/sign-in">
          Sign in
        </Link>
      </main>
    );
  return (
    <DataProvider onSessionExpired={expire}>
      <CapiroDataProvider onSessionExpired={expire}>
        {children}
      </CapiroDataProvider>
    </DataProvider>
  );
}
