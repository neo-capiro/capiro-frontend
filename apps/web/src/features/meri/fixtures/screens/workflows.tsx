import { WorkflowLibraryScreen } from "../../screens/workflows/WorkflowLibraryScreen";
import { CommitmentsScreen } from "../../screens/workflows/CommitmentsScreen";
import { SourcesCoverageScreen } from "../../screens/workflows/SourcesCoverageScreen";
import { SourceOperationsScreen } from "../../screens/workflows/SourceOperationsScreen";
import { ArtifactFormatsScreen } from "../../screens/workflows/ArtifactFormatsScreen";
import { CodeAnalysisScreen } from "../../screens/workflows/CodeAnalysisScreen";
import { WorkflowRequestScreen } from "../../screens/workflows/WorkflowRequestScreen";
import { WorkflowRunScreen } from "../../screens/workflows/WorkflowRunScreen";
import { FundingMarketScreen } from "../../screens/workflows/FundingMarketScreen";
import { BudgetComparisonScreen } from "../../screens/workflows/BudgetComparisonScreen";
import { RelationshipHistoryScreen } from "../../screens/workflows/RelationshipHistoryScreen";
import { PortfolioChangesScreen } from "../../screens/workflows/PortfolioChangesScreen";
import { GovernmentWatchScreen } from "../../screens/workflows/GovernmentWatchScreen";
import { MemoryConflictScreen } from "../../screens/workflows/MemoryConflictScreen";
import { ClarifyContextScreen } from "../../screens/workflows/ClarifyContextScreen";
import { FileExtractionScreen } from "../../screens/workflows/FileExtractionScreen";
import { BrowserPermissionsScreen } from "../../screens/workflows/BrowserPermissionsScreen";
import { CompanyResearchScreen } from "../../screens/workflows/CompanyResearchScreen";
import { PortfolioOverlapScreen } from "../../screens/workflows/PortfolioOverlapScreen";
import { ArtifactVerificationScreen } from "../../screens/workflows/ArtifactVerificationScreen";
import { ExactSourceRecordScreen } from "../../screens/workflows/ExactSourceRecordScreen";
import {
  codeAnalysis,
  commitments,
  exactSourceRecord,
  sourcesCoverage,
  workflowRequest,
  workflowRun,
} from "./workflows-commitments";
import {
  artifactFormats,
  artifactVerification,
  workflowLibrary,
} from "./workflows-library";
import {
  budgetComparison,
  companyResearch,
  fundingMarket,
  portfolioOverlap,
} from "./workflows-market";
import {
  clarifyContext,
  governmentWatch,
  memoryConflict,
  portfolioChanges,
  relationshipHistory,
} from "./workflows-relationships";
import {
  browserPermissions,
  fileExtraction,
  sourceOperations,
} from "./workflows-sources";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/** Figma 3.4 12 · Tooling coverage desktop frames (numbering kept as authored). */
export const workflowScreens: readonly FixtureScreen[] = [
  {
    slug: "workflow-library",
    figmaId: "12.01",
    figmaNode: "1064:151092",
    title: "Workflow library",
    Screen: () => (
      <WorkflowLibraryScreen
        view={workflowLibrary}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "commitments-deliverables",
    figmaId: "12.02",
    figmaNode: "1064:151177",
    title: "Commitments & Deliverables",
    Screen: () => (
      <CommitmentsScreen
        view={commitments}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "sources-coverage",
    figmaId: "12.03",
    figmaNode: "1064:151246",
    title: "Sources & coverage",
    Screen: () => (
      <SourcesCoverageScreen
        view={sourcesCoverage}
        backHref={fixtureHref("commitments-deliverables")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "source-operations",
    figmaId: "12.04",
    figmaNode: "1064:151332",
    title: "Source access & operations",
    Screen: () => (
      <SourceOperationsScreen
        view={sourceOperations}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "artifact-formats",
    figmaId: "12.05",
    figmaNode: "1064:151397",
    title: "Artifact formats",
    Screen: () => (
      <ArtifactFormatsScreen
        view={artifactFormats}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "code-analysis",
    figmaId: "12.06",
    figmaNode: "1064:151469",
    title: "Code & reproducible analysis",
    Screen: () => (
      <CodeAnalysisScreen
        view={codeAnalysis}
        backHref={fixtureHref("commitments-deliverables")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "workflow-request",
    figmaId: "12.07",
    figmaNode: "1064:151540",
    title: "Workflow request & context",
    Screen: () => (
      <WorkflowRequestScreen
        view={workflowRequest}
        backHref={fixtureHref("setup-commitments-audit")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "workflow-run",
    figmaId: "12.08",
    figmaNode: "1064:151605",
    title: "Workflow run & recovery",
    Screen: () => (
      <WorkflowRunScreen
        view={workflowRun}
        backHref={fixtureHref("workflow-request")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "funding-market",
    figmaId: "12.09",
    figmaNode: "1064:151682",
    title: "Funding & federal market",
    Screen: () => (
      <FundingMarketScreen
        view={fundingMarket}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "budget-comparison",
    figmaId: "12.12",
    figmaNode: "1064:151762",
    title: "Budget lines & exact comparison",
    Screen: () => (
      <BudgetComparisonScreen
        view={budgetComparison}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "relationship-history",
    figmaId: "12.10",
    figmaNode: "1064:151858",
    title: "Relationship & mail history",
    Screen: () => (
      <RelationshipHistoryScreen
        view={relationshipHistory}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "portfolio-changes",
    figmaId: "12.11",
    figmaNode: "1064:151930",
    title: "Client & portfolio changes",
    Screen: () => (
      <PortfolioChangesScreen
        view={portfolioChanges}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "government-watch",
    figmaId: "12.13",
    figmaNode: "1064:152002",
    title: "Government watch",
    Screen: () => (
      <GovernmentWatchScreen
        view={governmentWatch}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-conflict",
    figmaId: "12.14",
    figmaNode: "1064:152069",
    title: "Memory conflict & lifecycle",
    Screen: () => (
      <MemoryConflictScreen
        view={memoryConflict}
        backHref={fixtureHref("memory-detail")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "clarify-context",
    figmaId: "12.15",
    figmaNode: "1064:152144",
    title: "Clarify subject & context",
    Screen: () => (
      <ClarifyContextScreen
        view={clarifyContext}
        backHref={fixtureHref("workflow-request")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "file-extraction-coverage",
    figmaId: "12.16",
    figmaNode: "1064:152220",
    title: "Exact file extraction coverage",
    Screen: () => (
      <FileExtractionScreen
        view={fileExtraction}
        backHref={fixtureHref("sources-coverage")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "browser-permissions",
    figmaId: "12.17",
    figmaNode: "1064:152281",
    title: "Browser permissions & qualification",
    Screen: () => (
      <BrowserPermissionsScreen
        view={browserPermissions}
        backHref={fixtureHref("browser-sign-in")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "company-research",
    figmaId: "12.20",
    figmaNode: "1064:152370",
    title: "Company research & capture roadmap",
    Screen: () => (
      <CompanyResearchScreen
        view={companyResearch}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "portfolio-overlap",
    figmaId: "12.21",
    figmaNode: "1064:152468",
    title: "Portfolio overlap matrix",
    Screen: () => (
      <PortfolioOverlapScreen
        view={portfolioOverlap}
        backHref={fixtureHref("workflow-library")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "artifact-verification",
    figmaId: "12.18",
    figmaNode: "1064:152575",
    title: "Artifact verification",
    Screen: () => (
      <ArtifactVerificationScreen
        view={artifactVerification}
        backHref={fixtureHref("artifact-formats")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "exact-source-record",
    figmaId: "12.22",
    figmaNode: "1064:152635",
    title: "Exact source record",
    Screen: () => (
      <ExactSourceRecordScreen
        view={exactSourceRecord}
        backHref={fixtureHref("sources-coverage")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
