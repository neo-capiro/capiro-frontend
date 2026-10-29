import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { ConversationDeletionRequests } from "@/features/meri/privacy/ConversationDeletionRequests";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
function Harness() {
  const cache = useQueryClient();
  useEffect(() => {
    const change = (event: Event) =>
      cache.setQueryData(["identity"], (event as CustomEvent).detail);
    window.addEventListener("privacy-identity", change);
    return () => window.removeEventListener("privacy-identity", change);
  }, [cache]);
  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <ConversationDeletionRequests />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <Harness />
  </DataProvider>,
);
