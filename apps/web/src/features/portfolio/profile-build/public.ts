export { ProfileBuildPanel } from "./ProfileBuildPanel";
export {
  profileSubjectSchema,
  profileBuildPath,
  profileBuildKey,
  profileHref,
  type ProfileSubject,
} from "./subject";

export { CodeSelector } from "./CodeSelector";
export { readProfile, savePersonProfile } from "./profile-api";
export { useProfileSnapshot } from "./profile-queries";
export type { ProfileSnapshot, PersonProfileInput } from "./fact-contracts";
export { ProfileFacts, FactSource } from "./ProfileFacts";
export { ProfileCompleteness } from "./ProfileCompleteness";
export { IdentityMatch } from "./IdentityMatch";
export {
  previewProfileIdentity,
  identitySelectionName,
  type IdentityPreview,
  type IdentitySelection,
  type SourceCandidate,
  type IdentityClaim,
} from "./identity";
export type { ResearchInput } from "./research-contracts";

export { refreshAppliedSurfaces } from "./review-effects";
export { confirmProfileIdentity } from "./profile-api";
export { useLatestReview as useProfileBuildRun } from "./queries";

export { canResearchFile } from "./research-contracts";

export { CodeSuggestions } from "./CodeSuggestions";
export type {
  CodeSuggestion,
  RegistrationCodeField,
  RegistrationSuggestionContext,
  AcceptedCodeEvidence,
} from "./registration-suggestions";

export { useIdentityBinding } from "./useIdentityBinding";
