import { useSyncExternalStore, type ReactNode } from "react";

type TestSession = {
  providerStatus: "loading" | "error" | "ready" | "degraded";
  providerLoaded: boolean;
  isLoaded: boolean;
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
};
const initial: TestSession = {
  providerLoaded:
    new URLSearchParams(window.location.search).get("providerStatus") !==
    "loading",
  providerStatus:
    new URLSearchParams(window.location.search).get("providerStatus") ===
    "loading"
      ? "loading"
      : "ready",
  isLoaded: true,
  userId: "test-user",
  sessionId: "test-session",
  orgId: "test-org",
};
let session = initial;
const listeners = new Set<() => void>();
window.addEventListener("test:session", (event: Event) => {
  const detail = (event as CustomEvent<Partial<TestSession>>).detail;
  session = {
    ...initial,
    ...detail,
  };
  if (
    detail.providerStatus !== undefined &&
    detail.providerLoaded === undefined
  )
    session.providerLoaded = ["ready", "degraded"].includes(
      detail.providerStatus,
    );
  for (const notify of listeners) notify();
});
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};
export function useAuth() {
  const current = useSyncExternalStore(subscribe, () => session);
  return {
    ...current,
    isSignedIn: current.isLoaded && Boolean(current.userId),
  };
}
export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function ClerkLoaded({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, () => session);
  return current.providerLoaded ? <>{children}</> : null;
}
export function ClerkLoading({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, () => session);
  return current.providerStatus === "loading" ? <>{children}</> : null;
}
export function ClerkFailed({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, () => session);
  return current.providerStatus === "error" ? <>{children}</> : null;
}
export function SignIn() {
  return <p>Explicit test sign-in screen</p>;
}
export function UserButton() {
  return (
    <button type="button" aria-label="Test profile">
      T
    </button>
  );
}

/** Explicit synthetic identity only; no Clerk provider requests. */
export function useUser() {
  const current = useAuth();
  return {
    isLoaded: current.isLoaded,
    user: current.userId
      ? {
          id: current.userId,
          primaryEmailAddress: {
            emailAddress: current.email ?? "synthetic@example.test",
          },
          firstName: current.firstName ?? "Synthetic",
          lastName: current.lastName ?? "User",
        }
      : null,
  };
}
export function useClerk() {
  return {
    signOut: async () => {
      window.dispatchEvent(
        new CustomEvent("test:session", {
          detail: { userId: null, sessionId: null, orgId: null },
        }),
      );
    },
  };
}
export function useOrganizationList() {
  const { isLoaded } = useAuth();
  return { isLoaded, userMemberships: { data: [] }, setActive: undefined };
}
