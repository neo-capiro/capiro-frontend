import {
  defaultPolicyFields,
  type OutreachTemplateSpec,
} from "../../../../shared/capiro/operations/outreach-template-schemas";

export const templateFieldLabels: Record<
  (typeof defaultPolicyFields)[number],
  string
> = {
  goal: "Goal",
  objective: "Objective",
  topic: "Topic",
  desiredOutcome: "Desired outcome",
  ask: "Ask",
  whyNow: "Why now",
  sponsorScope: "Sponsor scope",
  audience: "Audience",
  delivery: "Delivery pattern",
  personalization: "Personalization",
  contextPolicy: "Context policy",
  campaignAngle: "Campaign angle",
  tone: "Tone",
  length: "Length",
  subjectStyle: "Subject style",
  ctaStyle: "CTA style",
  senderPolicy: "Sender",
  signaturePolicy: "Signature",
  schedulingPolicy: "Scheduling",
  attachmentPolicy: "Attachments",
  followUpPolicy: "Follow-up",
};
export function blankTemplate(): OutreachTemplateSpec {
  return {
    schemaVersion: "outreach_v3_template_v1",
    goal: {
      goal: null,
      objective: null,
      topic: null,
      desiredOutcome: null,
      ask: { mode: "undecided", text: null },
      whyNow: null,
    },
    sponsor: { kind: "undecided", label: null },
    targeting: { criteria: null },
    delivery: { pattern: "undecided", personalization: "undecided" },
    strategy: {
      campaignAngle: null,
      tone: null,
      length: "undecided",
      customLengthInstruction: null,
    },
    styleSamples: [],
    contentSkeleton: null,
    variables: [],
    defaultsPolicy: Object.fromEntries(
      defaultPolicyFields.map((field) => [field, "ask_each_campaign"]),
    ) as OutreachTemplateSpec["defaultsPolicy"],
    guidance: {
      audienceRule: null,
      contextPolicy: null,
      subjectStyle: null,
      ctaStyle: null,
      senderPolicy: null,
      signaturePolicy: null,
      schedulingPolicy: null,
      attachmentPolicy: null,
      followUpPolicy: null,
    },
    guardrails: {
      editAuthority: "owner_only",
      publishAuthority: "tenant_admin",
      sendAuthority: "any_authorized_sender",
      approvalMode: "individual",
      partialSendAllowed: false,
      requiredContextClasses: [],
      requiredPreflightChecks: [],
      senderRequirement: "any_authorized",
      attachmentRequirement: "optional",
      followUpRequired: false,
      variablesAutoResolveAllowed: false,
      allowSkipValidPlanDecision: false,
    },
  };
}
export function templateQuestionsValid(spec: OutreachTemplateSpec) {
  const keys = new Set<string>();
  return spec.variables.every((variable) => {
    if (
      !/^[a-z][a-z0-9_]{0,39}$/.test(variable.key) ||
      keys.has(variable.key) ||
      !variable.label.trim()
    )
      return false;
    keys.add(variable.key);
    return variable.type !== "choice" || Boolean(variable.choices?.length);
  });
}
