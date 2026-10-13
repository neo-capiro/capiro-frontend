import { useContext, useState } from "react";
import { usePathname } from "next/navigation";
import {
  useCapiro,
  usePublicOnboard,
} from "../../src/shared/capiro/CapiroBoundary";
import { SessionContext } from "../../src/shared/session/SessionContext";
import { isPublicOnboardPath } from "../../src/shared/session/onboard-route";

/** Synthetic composition probe; the real boundary alone owns replacement/reset. */
export function OnboardBoundaryProbe() {
  const api = useCapiro();
  const publicApi = usePublicOnboard();
  const pathname = usePathname();
  const session = useContext(SessionContext);
  const [draft, setDraft] = useState("");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  async function run(name: string, request: () => Promise<unknown>) {
    if (pending) return;
    setPending(name);
    setReceipt("");
    setError("");
    try {
      setReceipt(`${name}: ${JSON.stringify(await request())}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown failure");
    } finally {
      setPending("");
    }
  }
  return (
    <section aria-label="Synthetic Onboard boundary probe">
      <h1>Synthetic Onboard boundary probe</h1>
      <p>Intercepted composition test only; no authorization qualification.</p>
      <output data-testid="onboard-session">{session}</output>
      <label>
        Onboard scope draft
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <fieldset disabled={Boolean(pending)}>
        <button
          disabled={session !== "signed-in"}
          onClick={() =>
            void run("legal", () => api.request("onboard.funnel.legal", {}))
          }
        >
          Read authenticated legal
        </button>
        <button
          disabled={session !== "signed-in"}
          onClick={() =>
            void run("plan", () =>
              api.request("onboard.funnel.plan", { body: { plan: "trial" } }),
            )
          }
        >
          Write explicit trial plan
        </button>
        <button
          onClick={() =>
            void run("public", () =>
              isPublicOnboardPath(pathname)
                ? publicApi.request("public-onboard.invite", {
                    params: { token: pathname.split("/")[2]! },
                  })
                : publicApi.request("public-onboard.config", {}),
            )
          }
        >
          Read public onboarding
        </button>
      </fieldset>
      <output data-testid="onboard-pending">{pending}</output>
      <output data-testid="onboard-receipt">{receipt}</output>
      <output data-testid="onboard-error">{error}</output>
    </section>
  );
}
