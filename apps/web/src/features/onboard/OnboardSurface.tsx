"use client";

import type { ReactNode } from "react";
import { ConfigContext, type OnboardPresentationConfig } from "./useConfig";
import "./onboard.css";

/** Root supplies validated config and the sole session/query lifetime. */
export function OnboardSurface({
  config,
  children,
}: {
  config: OnboardPresentationConfig;
  children: ReactNode;
}) {
  return (
    <ConfigContext.Provider value={config}>
      <div className="onboard-surface">{children}</div>
    </ConfigContext.Provider>
  );
}
