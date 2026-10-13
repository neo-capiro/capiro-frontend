import { FunnelLifetime } from "../../lib/FunnelLifetime";
import type React from "react";
import { Navigate } from "../../navigation";
import { useAuth } from "@clerk/nextjs";
import { useFunnelSession } from "../../lib/funnel";
import { Btn, Card, FunnelShell } from "../../ui/primitives";
import { ErrorText, errorMessage } from "./shared";

import {
  FUNNEL_ROUTES,
  routeForState,
  type FunnelRoute,
} from "../../lib/funnel-routes";
export {
  FUNNEL_ROUTES,
  routeForState,
  type FunnelRoute,
} from "../../lib/funnel-routes";

/**
 * Redirects deep links forward/back to the furthest route the funnel session
 * allows. Unauthenticated visitors can only see /register (and /verify while
 * a Clerk sign-up is in flight — the page itself bounces if none exists).
 */
export function FunnelStepGuard({
  route,
  children,
}: {
  route: FunnelRoute;
  children: React.ReactElement;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const session = useFunnelSession();
  const content = (
    <FunnelLifetime sessionId={session.data?.sessionId ?? null}>
      {children}
    </FunnelLifetime>
  );

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return route === "/register" || route === "/verify" ? (
      content
    ) : (
      <Navigate to="/register" replace />
    );
  }
  if (session.isLoading) return null;
  if (session.error) {
    return (
      <FunnelShell step={null} maxWidth={460}>
        <Card>
          <ErrorText>{errorMessage(session.error)}</ErrorText>
          <Btn
            disabled={session.isFetching}
            onClick={() => void session.refetch()}
          >
            {session.isFetching ? "Checking…" : "Try again"}
          </Btn>
        </Card>
      </FunnelShell>
    );
  }
  if (!session.data) {
    // Signed in but no funnel session yet (register POST pending / not made).
    return route === "/register" || route === "/verify" ? (
      content
    ) : (
      <Navigate to="/register" replace />
    );
  }
  const allowed = routeForState(session.data.state);
  // Once provisioning has started (org_setup → …), pin the user to the
  // confirmation screen — earlier steps can no longer be edited.
  if (allowed === "/confirm") {
    return route === "/confirm" ? content : <Navigate to="/confirm" replace />;
  }
  // Otherwise let the user step BACK to any completed data-entry page (down to
  // /plan) while still bouncing forward jumps to the furthest allowed step.
  const allowedIdx = FUNNEL_ROUTES.indexOf(allowed);
  const routeIdx = FUNNEL_ROUTES.indexOf(route);
  const backFloorIdx = FUNNEL_ROUTES.indexOf("/plan");
  const minIdx = Math.min(allowedIdx, backFloorIdx);
  if (routeIdx < minIdx || routeIdx > allowedIdx) {
    return <Navigate to={allowed} replace />;
  }
  return content;
}
