import { PortfolioIndex } from "@/features/portfolio/index/PortfolioIndex";
import { PreviewClientCatalog } from "@/features/portfolio/index/PreviewClientCatalog";
import { readConfig } from "@/shared/portfolio/config/config";
import { isQualifiedCorePreviewReadEnabled } from "@/shared/preview/read-config.server";
export default function Page() {
  const destinations = readConfig(process.env).destinations;
  return isQualifiedCorePreviewReadEnabled(process.env) ? (
    <PreviewClientCatalog destinations={destinations} />
  ) : (
    <PortfolioIndex destinations={destinations} />
  );
}
