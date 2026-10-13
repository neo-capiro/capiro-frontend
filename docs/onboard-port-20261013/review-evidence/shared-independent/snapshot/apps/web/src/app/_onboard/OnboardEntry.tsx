import { readCapiroConfig } from "../../shared/capiro/config";
import { onboardPricingCopy } from "../../shared/capiro/onboard-pricing.server";
import type { OnboardRoute } from "../../features/onboard/OnboardPage";
import { OnboardHost } from "./OnboardHost";

export function OnboardEntry({ route }: { route: OnboardRoute }) {
  const config = readCapiroConfig(process.env);
  return (
    <OnboardHost
      route={route}
      publishableKey={config.publishableKey}
      serviceConfigured={Boolean(config.services.onboard)}
      pricingCopy={onboardPricingCopy}
    />
  );
}
