"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCapiro, usePublicOnboard } from "./CapiroBoundary";
import { createOnboardFunnelApi } from "./onboard-funnel-api";
import { createOnboardSetupApi } from "./onboard-setup-api";
import { createOnboardCoreApi } from "./onboard-core-api";
import { createOnboardPublicApi } from "./onboard-public-api";
export { validateOnboardInvoiceUrl } from "./onboard-navigation";

type OnboardApi = {
  funnel: ReturnType<typeof createOnboardFunnelApi>;
  setup: ReturnType<typeof createOnboardSetupApi>;
  core: ReturnType<typeof createOnboardCoreApi>;
  it: ReturnType<typeof createOnboardPublicApi>;
};
const OnboardApiContext = createContext<OnboardApi | null>(null);

/** Composition only: canonical application scope owns all transports and cache. */
export function OnboardApiProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: ReactNode;
}) {
  const authenticated = useCapiro();
  const publicApi = usePublicOnboard();
  const api = useMemo(
    () => ({
      funnel: createOnboardFunnelApi(authenticated),
      setup: createOnboardSetupApi(authenticated),
      core: createOnboardCoreApi(authenticated),
      it: createOnboardPublicApi(publicApi, apiBaseUrl),
    }),
    [authenticated, publicApi, apiBaseUrl],
  );
  return (
    <OnboardApiContext.Provider value={api}>
      {children}
    </OnboardApiContext.Provider>
  );
}

export function useOnboardApi() {
  const api = useContext(OnboardApiContext);
  if (!api) throw new Error("The canonical Onboard API boundary is required.");
  return api;
}
