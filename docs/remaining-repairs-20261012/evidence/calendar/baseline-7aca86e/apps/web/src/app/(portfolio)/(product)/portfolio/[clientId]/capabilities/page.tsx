import { CapabilitiesPage } from "@/features/portfolio/capabilities/CapabilitiesPage";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <CapabilitiesPage
      clientId={clientId}
      destinations={readConfig(process.env).destinations}
    />
  );
}
