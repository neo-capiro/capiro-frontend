import { ModuleHeader } from "./ModuleHeader";
import { publicPortfolioHref } from "./public-routing";

export function Header() {
  return (
    <ModuleHeader
      activeMode="meri"
      portfolioUrl={publicPortfolioHref(process.env.NEXT_PUBLIC_PORTFOLIO_URL)}
    />
  );
}
