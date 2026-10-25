import { readFileSync } from "node:fs";
// The Node fixture utility is published without a TypeScript declaration.
// @ts-expect-error Public Node hashing export has no declaration.
import { canonicalSha256 } from "@capiro/meri-contracts/node";
import type {
  ActionDraftResponse,
  ActionPrepareResponse,
  ActionQueryResponse,
  ActionRoute,
} from "@capiro/meri-contracts/action-application";
export function archivedFixture(name: string): {
  route: ActionRoute;
  httpStatus: number;
  response: unknown;
  request?: unknown;
} {
  return JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-actions/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}
export { canonicalSha256 };

export function fixture(name: string) {
  const value = archivedFixture(name);
  if (
    [
      "query",
      "query-interleaved-sequence",
      "query-foreign-intent-limit",
      "query-foreign-intent-page",
    ].includes(name)
  ) {
    // Keep the historical wire files immutable. These current synthetic queries
    // retain every other value and use the public contract's observation hash.
    const query = value.response as ActionQueryResponse;
    Reflect.deleteProperty(
      query.observation.subject,
      "authorizationDecisionId",
    );
    Reflect.deleteProperty(
      query.observation.result.subject,
      "authorizationDecisionId",
    );
    query.resultSha256 = canonicalSha256(query.observation);
  }
  if (
    [
      "draft",
      "draft-canonical-date",
      "draft-foreign-query-handle",
      "prepare",
      "prepare-canonical-date",
      "prepare-coherent-task-substitution",
      "prepare-foreign-supporting-draft",
      "prepare-recovered-worker",
    ].includes(name)
  ) {
    const draft =
      value.route === "draft"
        ? (value.response as ActionDraftResponse)
        : (value.response as ActionPrepareResponse).draft;
    draft.source.resultSha256 = (
      fixture("query").response as ActionQueryResponse
    ).resultSha256;
    const content = { ...draft };
    Reflect.deleteProperty(content, "draftSha256");
    draft.draftSha256 = canonicalSha256(content);
  }
  if (name === "draft") {
    const request = value.request as {
      selection: { resultSha256: string };
    };
    request.selection.resultSha256 = (
      fixture("query").response as ActionQueryResponse
    ).resultSha256;
  }
  if (name === "prepare") {
    const request = value.request as { draft: ActionDraftResponse };
    request.draft = fixture("draft").response as ActionDraftResponse;
  }
  return value;
}
export const context = JSON.parse(
  readFileSync(
    new URL("./fixtures/meri-actions/CONTEXT.json", import.meta.url),
    "utf8",
  ),
);
context.selection.resultSha256 = (
  fixture("query").response as ActionQueryResponse
).resultSha256;
export const clock = Date.parse(context.syntheticNow);
