import type {
  ProcurementMoneyFlow,
  ProcurementScopeRequest,
} from "@capiro/shared";
import { procurementScope } from "../../../../shared/capiro/operations/procurement-money-flow";

export const procurementAwardParam = "procurementAward";

export function readProcurementSelection(
  params: Pick<URLSearchParams, "getAll" | "get">,
) {
  const keys = params.getAll(procurementAwardParam);
  if (!keys.length) return { scope: null, error: null };
  const result = procurementScope.safeParse({
    awardIdentityKeys: keys,
    ...(params.get("procurementKnownAt")
      ? { knownAt: params.get("procurementKnownAt") }
      : {}),
    ...(params.get("procurementSourceThrough")
      ? { sourceThrough: params.get("procurementSourceThrough") }
      : {}),
  });
  return result.success
    ? { scope: result.data, error: null }
    : {
        scope: null,
        error:
          "This award selection is invalid. Clear it and choose up to 25 full award records.",
      };
}

export function writeProcurementSelection(
  params: URLSearchParams,
  scope: ProcurementScopeRequest | null,
) {
  const next = new URLSearchParams(params);
  next.delete(procurementAwardParam);
  next.delete("procurementKnownAt");
  next.delete("procurementSourceThrough");
  for (const key of scope?.awardIdentityKeys ?? [])
    next.append(procurementAwardParam, key);
  if (scope?.knownAt) next.set("procurementKnownAt", scope.knownAt);
  if (scope?.sourceThrough)
    next.set("procurementSourceThrough", scope.sourceThrough);
  return next;
}

export function procurementHref(
  destination: "hub" | "acquisitions",
  scope: ProcurementScopeRequest | null,
  clientId: string,
) {
  const params = writeProcurementSelection(new URLSearchParams(), scope);
  if (clientId) params.set("clientId", clientId);
  if (destination === "acquisitions") {
    params.set("view", "research");
    params.set("researchSegment", "acquisitions");
  }
  return `${destination === "hub" ? "/modules" : "/modules/intelligence"}?${params}`;
}

export function sameProcurementScope(
  expected: ProcurementScopeRequest,
  actual: Pick<ProcurementMoneyFlow, "scope" | "knownAt" | "sourceThrough">,
) {
  const left = [...expected.awardIdentityKeys].sort();
  const right = [...actual.scope.awardIdentityKeys].sort();
  return (
    !actual.scope.includesDescendants &&
    JSON.stringify(left) === JSON.stringify(right) &&
    (!expected.knownAt || expected.knownAt === actual.knownAt) &&
    (expected.sourceThrough ?? null) === actual.sourceThrough
  );
}

/** Decimal strings stay strings, including fractions beyond cents and values beyond Number. */
export function procurementUsd(value: string | null) {
  if (value === null) return "Not reported";
  const match = /^(-?)(\d+)(\.\d+)?$/.exec(value);
  if (!match) return "Not available";
  return `${match[1]}$${match[2]!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${match[3] ?? ""}`;
}

export function selectableAward(identityKey: string) {
  return procurementScope.safeParse({ awardIdentityKeys: [identityKey] })
    .success;
}
