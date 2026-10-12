import { useSyncExternalStore, type ReactNode } from "react";

type TestSession = {
  isLoaded: boolean;
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
};
const initial: TestSession = {
  isLoaded: true,
  userId: "test-user",
  sessionId: "test-session",
  orgId: "test-org",
};
let session = initial;
const listeners = new Set<() => void>();
window.addEventListener("test:session", (event: Event) => {
  session = {
    ...initial,
    ...(event as CustomEvent<Partial<TestSession>>).detail,
  };
  for (const notify of listeners) notify();
});
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};
export function useAuth() {
  return useSyncExternalStore(subscribe, () => session);
}
export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function ClerkLoaded({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function ClerkLoading() {
  return null;
}
export function ClerkFailed() {
  return null;
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
