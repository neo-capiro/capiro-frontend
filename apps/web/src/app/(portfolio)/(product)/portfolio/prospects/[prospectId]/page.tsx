import { readConfig } from "@/shared/portfolio/config/config";
import { ProspectDetail } from "@/features/portfolio/prospects/ProspectDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ prospectId: string }>;
}) {
  const { prospectId } = await params;
  return (
    <ProspectDetail
      id={prospectId}
      destinations={readConfig(process.env).destinations}
    />
  );
}
