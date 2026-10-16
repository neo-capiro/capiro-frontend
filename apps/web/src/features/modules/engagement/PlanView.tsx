"use client";
import { EngagementPlanWorkspace } from "./plan/EngagementPlanWorkspace";

export function PlanView({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName?: string;
}) {
  const scope = clientId.toLowerCase();
  return (
    <EngagementPlanWorkspace
      key={scope}
      clientId={scope}
      clientName={clientName}
    />
  );
}
