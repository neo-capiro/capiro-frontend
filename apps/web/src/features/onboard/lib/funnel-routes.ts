import type { FunnelState } from "@/shared/capiro/onboard-contracts";

export const FUNNEL_ROUTES = [
  "/register",
  "/verify",
  "/plan",
  "/legal",
  "/billing",
  "/admins",
  "/clients",
  "/org",
  "/confirm",
] as const;

export type FunnelRoute = (typeof FUNNEL_ROUTES)[number];

/** session.state → the single (furthest) route the user may be on. */
export function routeForState(state: FunnelState | undefined): FunnelRoute {
  switch (state) {
    case "registered":
      return "/verify";
    case "verified":
      return "/plan";
    case "plan_selected":
      return "/legal";
    case "legal_accepted":
      return "/billing";
    case "payment_on_file":
      return "/admins";
    case "roles_designated":
      return "/clients";
    case "import_pref":
      return "/org";
    case "org_setup":
    case "provisioning":
    case "provisioned":
    case "failed":
      return "/confirm";
    default:
      return "/register";
  }
}
