import { notFound } from "next/navigation";
import { ModuleScreen } from "../../../features/modules/ModuleScreen";
import { ConnectedModule } from "../../../shared/shell/ConnectedModule";
import { moduleCatalog } from "../../../shared/shell/module-catalog";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const descriptor = moduleCatalog.find(
    (candidate) => candidate.slug === module,
  );
  if (!descriptor) notFound();
  return (
    <ConnectedModule active={descriptor.slug}>
      <ModuleScreen module={descriptor.slug} />
    </ConnectedModule>
  );
}
