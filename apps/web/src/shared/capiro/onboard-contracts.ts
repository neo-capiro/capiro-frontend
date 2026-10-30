import type { z } from "zod";
import type * as Funnel from "./operations/onboard-funnel-schemas";
import type * as Setup from "./operations/onboard-setup-schemas";
import type * as Core from "./operations/onboard-core-schemas";
import type { editableTeamRoleSchema } from "./operations/settings-schemas";

/** Feature-facing types derive from the single fixed-operation receiving schemas. */
export type FunnelState = z.infer<typeof Funnel.funnelStateSchema>;
export type PlanChoice = z.infer<typeof Funnel.planChoiceSchema>;
export type PayMethod = z.infer<typeof Funnel.payMethodSchema>;
export type RoleMode = z.infer<typeof Funnel.roleModeSchema>;
export type ImportMode = z.infer<typeof Funnel.importModeSchema>;
export type RoleDesignation = z.infer<typeof Funnel.roleDesignationSchema>;
export type OrgProfile = z.infer<typeof Funnel.orgProfileSchema>;
export type FunnelSession = z.infer<typeof Funnel.funnelSessionSchema>;
export type LegalDoc = z.infer<typeof Funnel.legalDocSchema>;
export type FunnelStatus = z.infer<typeof Funnel.funnelStatusSchema>;
export type SetupTaskKey = z.infer<typeof Setup.setupTaskKeySchema>;
export type SetupTaskStatus = z.infer<typeof Setup.setupTaskStatusSchema>;
export type SetupTransitionStatus = z.infer<
  typeof Setup.setupTransitionStatusSchema
>;
export type SetupItInvite = z.infer<typeof Setup.setupItInviteSchema>;
export type SetupState = z.infer<typeof Setup.setupStateSchema>;
export type ItInviteView = z.infer<typeof Setup.itInviteViewSchema>;
export type OnboardConfig = z.infer<typeof Setup.onboardConfigSchema>;
export type RegistrantHit = z.infer<typeof Core.registrantHitSchema>;
export type TenantRegistrant = z.infer<typeof Core.tenantRegistrantSchema>;
export type ImportCandidate = z.infer<typeof Core.importCandidateSchema>;
export type ImportCandidatesResult = z.infer<
  typeof Core.importCandidatesSchema
>;
export type ImportResult = z.infer<typeof Core.importChunkResultSchema> & {
  capMessage: string | null;
};
export type ImportJobStatus = z.infer<typeof Core.importJobStatusSchema>;
export type ImportItemOutcome = z.infer<typeof Core.importItemOutcomeSchema>;
export type ImportItemCode = z.infer<typeof Core.importItemCodeSchema>;
export type ImportJobCounts = z.infer<typeof Core.importJobCountsSchema>;
export type ImportChunkJobSummary = z.infer<
  typeof Core.importChunkJobSummarySchema
>;
export type ImportJobItem = z.infer<typeof Core.importJobItemSchema>;
export type ImportJobPopulation = z.infer<
  typeof Core.importJobPopulationSchema
>;
export type ImportJob = z.infer<typeof Core.importJobViewSchema>;
export type ImportJobPage = z.infer<typeof Core.importJobPageSchema>;
export type ImportJobStatusView = z.infer<
  typeof Core.importJobStatusViewSchema
>;
export type TeamInviteRole = z.infer<typeof editableTeamRoleSchema>;
