import { RelationshipsPage } from "@/features/portfolio/relationships/RelationshipsPage";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <RelationshipsPage
      clientId={clientId}
      destinations={readConfig(process.env).destinations}
    />
  );
}
