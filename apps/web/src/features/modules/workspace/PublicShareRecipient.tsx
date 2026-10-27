"use client";
import { useEffect, useState } from "react";
import { createCapiroApi } from "../../../shared/capiro/http";
import { publicShareOperations } from "../../../shared/capiro/operations/share-public";
import type { OperationResponse } from "../../../shared/capiro/contracts";
import { StatusPanel } from "../../../shared/module-ui";
import { ShareUnavailable } from "../../../shared/module-ui/ShareUnavailable";
import { ResearchShareRecipient } from "../research-portfolios/share/ResearchShareRecipient";
import styles from "./public-share.module.css";

const api = createCapiroApi(publicShareOperations, { credentials: "omit" });
const validToken = /^[0-9a-f]{64}$/;
type SharedDocument = OperationResponse<
  (typeof publicShareOperations)["public-share.document"]
>;

/** One canonical address dispatches only after the shared lifecycle admits its kind. */
export function PublicShareRecipient({ token }: { token: string }) {
  return <ShareSession key={token} token={token} />;
}

function ShareSession({ token }: { token: string }) {
  const [kind, setKind] = useState<
    "research_portfolio" | "workspace_document" | false
  >();
  useEffect(() => {
    if (!validToken.test(token)) return;
    const controller = new AbortController();
    api
      .request(
        "public-share.kind",
        { params: { token } },
        { signal: controller.signal },
      )
      .then(
        (result) => {
          if (!controller.signal.aborted)
            setKind(result.available && result.kind ? result.kind : false);
        },
        () => {
          if (!controller.signal.aborted) setKind(false);
        },
      );
    return () => controller.abort();
  }, [token]);
  if (!validToken.test(token) || kind === false) return <ShareUnavailable />;
  if (kind === "research_portfolio")
    return <ResearchShareRecipient token={token} />;
  if (kind === "workspace_document") return <DocumentRecipient token={token} />;
  return (
    <main className={styles.page}>
      <StatusPanel loading />
    </main>
  );
}

function DocumentRecipient({ token }: { token: string }) {
  const [document, setDocument] = useState<SharedDocument | null>();
  useEffect(() => {
    const controller = new AbortController();
    api
      .request(
        "public-share.document",
        { params: { token } },
        { signal: controller.signal },
      )
      .then(
        (result) => {
          if (!controller.signal.aborted) setDocument(result);
        },
        () => {
          if (!controller.signal.aborted) setDocument(null);
        },
      );
    return () => controller.abort();
  }, [token]);
  if (document === null) return <ShareUnavailable />;
  return (
    <main className={styles.page}>
      <StatusPanel loading={!document}>
        {document && (
          <article>
            <h1>{document.docTitle}</h1>
            {document.sections.map((section) => (
              <section key={section.id}>
                <h2>{section.title}</h2>
                <p className={styles.content}>{section.content}</p>
              </section>
            ))}
          </article>
        )}
      </StatusPanel>
    </main>
  );
}
