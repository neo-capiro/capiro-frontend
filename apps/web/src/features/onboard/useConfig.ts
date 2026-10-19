import { createContext, useContext } from "react";
import type { OnboardConfig } from "@/shared/capiro/onboard-contracts";

export type OnboardPresentationConfig = OnboardConfig & {
  pricingCopy: { lock: string; change: string };
};

export const ConfigContext = createContext<OnboardPresentationConfig | null>(
  null,
);

export function useConfig(): OnboardPresentationConfig {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error("useConfig used outside ConfigContext (boot bug)");
  }
  return config;
}
