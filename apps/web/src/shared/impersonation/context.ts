"use client";
import { createContext, useContext } from "react";
export type ImpersonationEntry = {
  start: (tenantId: string, reason: string) => Promise<void>;
  busy: boolean;
  ready: boolean;
  error?: string;
};
export const ImpersonationContext = createContext<ImpersonationEntry | null>(
  null,
);
export const useImpersonationEntry = () => useContext(ImpersonationContext);
export const impersonationEvent = "capiro-impersonation-change";
export function notifyImpersonationChange() {
  window.dispatchEvent(new Event(impersonationEvent));
  const channel = new BroadcastChannel(impersonationEvent);
  channel.postMessage("changed");
  channel.close();
}
