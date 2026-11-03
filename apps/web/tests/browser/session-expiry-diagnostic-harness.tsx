/**
 * Mounted lifecycle fixture for the session-verification failure screen.
 *
 * The whole production path runs: ApplicationBoundary -> AuthenticationProvider ->
 * DataProvider/CapiroDataProvider -> the mounted identity consumers. Only the network
 * is synthetic: `fetch` answers every request with the configured status and the
 * configured X-Capiro-Auth-Class values, so the 401 reaches the real transport, the
 * real expiry callback and the real state update - nothing is invoked by hand.
 */
import { createRoot } from "react-dom/client";
import { ApplicationBoundary } from "@/shared/session/ApplicationBoundary";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

const params = new URLSearchParams(window.location.search);
const status = Number(params.get("status") ?? "401");
const values = params.getAll("class");
const responseBody =
  params.get("body") === "html"
    ? "<html>gateway"
    : JSON.stringify({ message: "Synthetic refusal" });

window.fetch = (async () => {
  // A short delay keeps the mounted page observable before the 401 resolves.
  await new Promise((resolve) => setTimeout(resolve, 600));
  const headers = new Headers();
  for (const value of values) headers.append("x-capiro-auth-class", value);
  return new Response(responseBody, { status, headers });
}) as typeof fetch;

history.replaceState({}, "", "/portfolio/10000000-0000-4000-8000-000000000001");

createRoot(document.getElementById("root")!).render(
  <>
    {/* Outside the boundary: proves this fixture actually mounted and stayed mounted. */}
    <p data-harness="mounted">Mounted fixture</p>
    <ApplicationBoundary publishableKey="pk_test_synthetic">
      <p>Synthetic client page</p>
    </ApplicationBoundary>
  </>,
);
