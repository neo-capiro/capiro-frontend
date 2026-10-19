"use client";
import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";

export type SessionState =
  | "unconfigured"
  | "loading"
  | "signed-out"
  | "signed-in"
  | "expired";
export const SessionContext = createContext<SessionState>("unconfigured");
export function RequireSession({ children }: { children: ReactNode }) {
  const state = useContext(SessionContext);
  if (state === "signed-in") return children;
  if (state === "loading") return <p role="status">Loading your session…</p>;
  if (state === "unconfigured")
    return (
      <section role="status">
        <h2>Connection setup required</h2>
        <p>
          Your Capiro administrator must connect the designated sign-in
          application and existing services to enable this workspace.
        </p>
      </section>
    );
  return (
    <section>
      <h2>
        {state === "expired" ? "Your session expired" : "Sign in to Capiro"}
      </h2>
      <p>Use your firm account to access this workspace.</p>
      <Link href="/sign-in">Sign in</Link>
    </section>
  );
}
