import { notFound } from "next/navigation";
import { ModuleScreen } from "../../../features/modules/ModuleScreen";
import { ConnectedModule } from "../../../shared/shell/ConnectedModule";
import { moduleCatalog } from "../../../shared/shell/module-catalog";
import { readOfficeConfig } from "../../../shared/meri-office/config";
import { readDocumentConfig } from "../../../shared/meri-documents/config";
import { readConfig } from "../../../shared/portfolio/config/config";

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
  const documents = readDocumentConfig(process.env);
  const tracker = readConfig(process.env);
  return (
    <ConnectedModule active={descriptor.slug}>
      <ModuleScreen
        trackerConfig={{
          trackerBackend: tracker.trackerBackend,
          trackerMetricsVersion: tracker.trackerMetricsVersion,
          destinations: tracker.destinations,
        }}
        module={descriptor.slug}
        officeEnabled={readOfficeConfig(process.env).enabled}
        documentOperation={documents.enabled ? documents.operation : null}
      />
    </ConnectedModule>
  );
}
