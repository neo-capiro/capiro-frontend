"use client";
import { useContext, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  OnboardPage,
  type OnboardRoute,
} from "../../features/onboard/OnboardPage";
import { OnboardSurface } from "../../features/onboard/OnboardSurface";
import type { OnboardPresentationConfig } from "../../features/onboard/useConfig";
import { OnboardApiProvider } from "../../shared/capiro/onboard-api";
import { usePublicOnboard } from "../../shared/capiro/CapiroBoundary";
import { SessionContext } from "../../shared/session/SessionContext";
import { isPublicOnboardPath } from "../../shared/session/onboard-route";

const subscribeToOrigin = () => () => {};
const currentOrigin = () => window.location.origin;
const serverOrigin = () => "";

/** One client composition point; public configuration never selects an upstream. */
export function OnboardHost({
  route,
  publishableKey,
  serviceConfigured,
  pricingCopy,
}: {
  route: OnboardRoute;
  publishableKey?: string;
  serviceConfigured: boolean;
  pricingCopy: OnboardPresentationConfig["pricingCopy"];
}) {
  const api = usePublicOnboard();
  const session = useContext(SessionContext);
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    currentOrigin,
    serverOrigin,
  );
  const config = useQuery({
    queryKey: ["onboard", "public-config"],
    queryFn: ({ signal }) =>
      api.request("public-onboard.config", {}, { signal }),
    enabled: serviceConfigured,
    retry: false,
    staleTime: 0,
  });
  const capability = isPublicOnboardPath(route);
  if (!capability && session === "loading")
    return <p role="status">Loading sign-in…</p>;
  if (
    !serviceConfigured ||
    (!capability && (!publishableKey || session === "unconfigured"))
  )
    return (
      <section role="status">
        <h1>Onboarding setup required</h1>
        <p>
          Connect the designated sign-in application and existing onboarding
          service.
        </p>
      </section>
    );
  if (config.isError)
    return (
      <section role="alert">
        <h1>Onboarding unavailable</h1>
        <p>The current onboarding configuration could not be verified.</p>
        <button onClick={() => void config.refetch()}>Try again</button>
      </section>
    );
  if (!origin || config.isPending || config.isFetching)
    return <p role="status">Loading onboarding configuration…</p>;
  if (!capability && config.data.clerkPublishableKey !== publishableKey)
    return (
      <section role="alert">
        <h1>Onboarding sign-in unavailable</h1>
        <p>
          The onboarding service must use the designated application sign-in.
        </p>
      </section>
    );
  return (
    <OnboardApiProvider apiBaseUrl={config.data.apiBaseUrl}>
      <OnboardSurface
        config={{
          ...config.data,
          appBaseUrl: origin,
          onboardingBaseUrl: origin,
          pricingCopy,
        }}
      >
        <OnboardPage route={route} />
      </OnboardSurface>
    </OnboardApiProvider>
  );
}
