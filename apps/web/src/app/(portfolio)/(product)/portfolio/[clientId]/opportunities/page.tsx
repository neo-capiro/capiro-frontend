import { OpportunitiesPage } from "@/features/portfolio/opportunities/OpportunitiesPage";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <OpportunitiesPage
      clientId={clientId}
      destinations={readConfig(process.env).destinations}
    />
  );
}
