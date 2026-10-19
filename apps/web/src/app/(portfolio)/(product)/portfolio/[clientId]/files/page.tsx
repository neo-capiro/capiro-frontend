import { FilesPage } from "@/features/portfolio/files/FilesPage";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ file?: string | string[] }>;
}) {
  const [{ clientId }, { file }] = await Promise.all([params, searchParams]);
  return (
    <FilesPage
      clientId={clientId}
      destinations={readConfig(process.env).destinations}
      linkedFileId={typeof file === "string" && file ? file : undefined}
    />
  );
}
