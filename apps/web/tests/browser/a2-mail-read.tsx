import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { ContactMail } from "@/features/portfolio/relationships/ContactMail";
import { TimelineMailThread } from "@/features/portfolio/relationships/thread/TimelineMailThread";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import {
  threadClientId,
  threadId,
  threadTenantId,
} from "../thread-mail-fixture";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
function Harness() {
  const cache = useQueryClient();
  const params = new URLSearchParams(location.search);
  return (
    <main
      data-portfolio-root
      className="stack"
      style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}
    >
      <h1>Synthetic Mail read fixture</h1>
      <button
        className="button"
        onClick={() =>
          cache.setQueryData(["identity"], {
            user: {
              id: "70000000-0000-4000-8000-000000000002",
              email: "other@example.test",
            },
            tenant: { id: threadTenantId, name: "Synthetic" },
            role: "standard_user",
          })
        }
      >
        Change synthetic account
      </button>
      {params.has("timeline") ? (
        <TimelineMailThread clientId={threadClientId} threadId={threadId} />
      ) : (
        <ContactMail
          clientId={threadClientId}
          person={{
            name: "Synthetic contact",
            title: null,
            email: params.has("noEmail") ? null : "person@example.test",
          }}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <Harness />
  </PortfolioHarnessProviders>,
);
