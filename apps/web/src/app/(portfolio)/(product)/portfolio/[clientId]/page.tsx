import { readConfig } from "@/shared/portfolio/config/config";
import { ClientOverview } from "@/features/portfolio/client-profile/ClientOverview";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <ClientOverview
      clientId={clientId}
      recordedActivityVersion={readConfig(process.env).recordedActivityVersion}
    />
  );
}
