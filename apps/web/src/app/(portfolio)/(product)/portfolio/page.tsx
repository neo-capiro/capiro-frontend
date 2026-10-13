import { PortfolioIndex } from "@/features/portfolio/index/PortfolioIndex";
import { readConfig } from "@/shared/portfolio/config/config";
export default function Page() {
  return <PortfolioIndex destinations={readConfig(process.env).destinations} />;
}
