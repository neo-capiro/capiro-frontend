"use client";

import type { ComponentType } from "react";
import { useConfig } from "./useConfig";
import { FunnelShell, ScreenTitle, Card } from "./ui/primitives";
import {
  FunnelStepGuard,
  type FunnelRoute,
} from "./pages/funnel/FunnelStepGuard";
import { RegisterPage } from "./pages/funnel/RegisterPage";
import { VerifyPage } from "./pages/funnel/VerifyPage";
import { PlanPage } from "./pages/funnel/PlanPage";
import { LegalPage } from "./pages/funnel/LegalPage";
import { BillingPage } from "./pages/funnel/BillingPage";
import { AdminsPage } from "./pages/funnel/AdminsPage";
import { ClientsPage } from "./pages/funnel/ClientsPage";
import { OrgPage } from "./pages/funnel/OrgPage";
import { ConfirmPage } from "./pages/funnel/ConfirmPage";
import { SetupDashboardPage } from "./pages/setup/SetupDashboardPage";
import { AcceptInvitePage } from "./pages/setup/AcceptInvitePage";
import { ItAdminPage } from "./pages/it/ItAdminPage";
import { ItDonePage } from "./pages/it/ItDonePage";
import { ItErrorPage } from "./pages/it/ItErrorPage";

const funnelPages: Record<FunnelRoute, ComponentType> = {
  "/register": RegisterPage,
  "/verify": VerifyPage,
  "/plan": PlanPage,
  "/legal": LegalPage,
  "/billing": BillingPage,
  "/admins": AdminsPage,
  "/clients": ClientsPage,
  "/org": OrgPage,
  "/confirm": ConfirmPage,
};
const setupPages = {
  "/setup": SetupDashboardPage,
  "/accept-invite": AcceptInvitePage,
  "/it/:token": ItAdminPage,
  "/it/done": ItDonePage,
  "/it/error": ItErrorPage,
} satisfies Record<string, ComponentType>;
export type OnboardRoute = FunnelRoute | keyof typeof setupPages;

/** Presentation lookup only; Next owns route matching and navigation. */
export function OnboardPage({ route }: { route: OnboardRoute }) {
  const config = useConfig();
  if (route in setupPages) {
    const Page = setupPages[route as keyof typeof setupPages];
    return <Page />;
  }
  if (!config.funnelEnabled) {
    return (
      <FunnelShell step={null} maxWidth={460}>
        <Card style={{ textAlign: "center", padding: "40px 36px" }}>
          <ScreenTitle
            title="Self-service onboarding is almost here"
            sub="Onboarding is not yet open. Reach us at sales@capiro.ai for a guided setup."
          />
        </Card>
      </FunnelShell>
    );
  }
  const funnelRoute = route as FunnelRoute;
  const Page = funnelPages[funnelRoute];
  return (
    <FunnelStepGuard route={funnelRoute}>
      <Page />
    </FunnelStepGuard>
  );
}
