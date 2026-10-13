import { WorkPage } from "@/features/portfolio/work/WorkPage";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <WorkPage
      clientId={clientId}
      destinations={readConfig(process.env).destinations}
    />
  );
}
