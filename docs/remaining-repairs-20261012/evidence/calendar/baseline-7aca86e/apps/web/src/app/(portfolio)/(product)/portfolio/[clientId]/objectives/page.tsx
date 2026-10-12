import { ObjectivesPage } from "@/features/portfolio/objectives/ObjectivesPage";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <ObjectivesPage clientId={clientId} />;
}
