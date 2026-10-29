"use client";
import { PageHeader, Tabs } from "../../../../shared/module-ui";
import { ContextRecords } from "./ContextRecords";
import { OfficeRecords } from "./OfficeRecords";
import { AcquisitionRecords } from "./AcquisitionRecords";
import { DossierRecords } from "./DossierRecords";
import { useResearchLocation } from "./ResearchNavigation";
const segments = [
  { id: "documents", label: "Context documents" },
  { id: "offices", label: "Offices & relationships" },
  { id: "acquisitions", label: "Acquisitions" },
  { id: "dossiers", label: "Dossiers & funding" },
] as const;
export function ResearchWorkspace() {
  const { params, update } = useResearchLocation();
  const requested = params.get("researchSegment");
  const segment =
    segments.find((item) => item.id === requested)?.id || "documents";
  return (
    <>
      <PageHeader
        title="Research"
        description="Browse source-backed research. Coverage and source qualification remain explicit for each record."
      />
      <Tabs
        items={segments}
        value={segment}
        label="Research segments"
        onChange={(value) =>
          update({
            researchSegment: value,
            researchId: null,
            researchPage: null,
            researchQuery: null,
          })
        }
      />
      {segment === "documents" && <ContextRecords />}
      {segment === "offices" && <OfficeRecords />}
      {segment === "acquisitions" && <AcquisitionRecords />}
      {segment === "dossiers" && <DossierRecords />}
    </>
  );
}
