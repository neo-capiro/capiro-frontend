import { z } from "zod";

export const askTypes = {
  funding: "Funding",
  policy_authority: "Policy or authority",
  both: "Both",
  protect_funding: "Protect existing funding",
  meri_propose: "Not sure, let Meri propose",
} as const;
export const objectiveStatusLabels = {
  draft: "Draft",
  in_review: "In review",
  ready: "Ready",
} as const;
export const objectiveStatus = z.enum(["draft", "in_review", "ready"]);
export const objectiveFieldsSchema = z.object({
  outcome: z.string().trim().max(2000),
  governmentProblem: z.string().trim().max(4000),
  askType: z
    .enum([
      "funding",
      "policy_authority",
      "both",
      "protect_funding",
      "meri_propose",
    ])
    .nullable(),
  minimumWin: z.string().trim().max(2000),
  limits: z.string().trim().max(4000),
});
