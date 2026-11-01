import { expect, it } from "vitest";
import { FederalWorkbenchAccess } from "../src/shared/meri-documents/federal-workbench";
import { federalTransport } from "../src/shared/meri-documents/workflow-transport";
import {
  idleDocumentAttempt,
  type DocumentAttempt,
} from "../src/shared/meri-documents/attempt-journal";
import type { DocumentLibraryAccess } from "../src/shared/meri-documents/library-access";
import { receiveFederalRequest } from "@capiro/meri-contracts/federal-workbench";
import fixture from "./fixtures/federal-structural-exports.json";
import pdfFixture from "./fixtures/federal-structural-pdf.json";
const receiptPins = [
  "sourceSha256",
  "consolidatedSha256",
  "revisionSha256",
  "specSha256",
  "executionRequestSha256",
  "mappingSha256",
] as const;
function setup(
  kind: "supported" | "unsupported" | "pdf" = "supported",
  tamper?: (typeof receiptPins)[number] | "mapping" | "omissions",
) {
  const scenario = kind === "pdf" ? pdfFixture.admittedPdf : fixture[kind],
    version = scenario.imported.result.publication.version;
  let attempt: DocumentAttempt = idleDocumentAttempt,
    fail = false;
  const signal = new AbortController().signal,
    requests: Array<Record<string, unknown>> = [];
  const transport = federalTransport(
    "action_session_" + "a".repeat(43),
    signal,
    async (url, init) => {
      const input = JSON.parse(String(init?.body));
      if (String(url).endsWith("federal-prepare"))
        return Response.json(scenario.prepared.result, {
          status: scenario.prepared.status,
        });
      requests.push(input);
      if (fail) throw Error("Synthetic export acknowledgement lost");
      const record =
        scenario.exports[input.output as keyof typeof scenario.exports];
      const result = structuredClone(record.result);
      if (tamper && "structuralReceipt" in result) {
        if (tamper === "mapping")
          Object.assign(result.structuralReceipt.mapping[0]!, { rawStart: 0 });
        else if (tamper === "omissions")
          result.structuralReceipt.omissions.pop();
        else result.structuralReceipt[tamper] = "0".repeat(64);
      }
      return Response.json(result, { status: record.status });
    },
  );
  const port = new FederalWorkbenchAccess({
    library: { dispose() {} } as unknown as DocumentLibraryAccess,
    transport,
    session: {
      context: {
        ...version.binding,
        selectedClientId: version.scopes[0]!.resourceId,
      },
      expiresAtMs: Date.now() + 60000,
    },
    journal: {
      read: () => attempt,
      write: (value) => {
        attempt = value;
      },
    },
    onAccessLost() {},
  });
  const request = receiveFederalRequest(
    "federal-prepare",
    new TextEncoder().encode(JSON.stringify(scenario.prepared.input)),
  );
  return {
    port,
    signal,
    requests,
    prepare: () => port.prepare(request.selection, signal),
    attempt: () => attempt,
    setFail: (value: boolean) => {
      fail = value;
    },
  };
}
it("admits actual structural Word and exact XML responses through the canonical receiver", async () => {
  const x = setup(),
    review = await x.prepare();
  const word = await x.port.publish(review, "docx", x.signal);
  expect(word.structuralReceipt).toEqual(
    fixture.supported.exports.docx.result.structuralReceipt,
  );
  const xml = await x.port.publish(review, "xml", x.signal);
  expect(xml.publication.version.mimeType).toBe(
    "application/xml; charset=utf-8",
  );
  expect(xml.publication.version.object.sha256).toBe(
    review.prepared.draft.outputHashes.consolidated,
  );
  expect(xml.publication.version.object.bytes).toBe(
    new TextEncoder().encode(review.prepared.draft.outputs.consolidated).length,
  );
  expect(x.requests.map((request) => request.output)).toEqual(["docx", "xml"]);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it.each(receiptPins)(
  "withholds a Word response with an altered %s receipt pin",
  async (pin) => {
    const x = setup("supported", pin),
      review = await x.prepare();
    await expect(x.port.publish(review, "docx", x.signal)).rejects.toThrow();
    expect(x.attempt().status).toBe("unresolved");
    x.port.dispose();
  },
);
it.each(["mapping", "omissions"] as const)(
  "withholds altered structural %s even when receipt hashes are untouched",
  async (tamper) => {
    const x = setup("supported", tamper),
      review = await x.prepare();
    await expect(x.port.publish(review, "docx", x.signal)).rejects.toThrow();
    expect(x.attempt().status).toBe("unresolved");
    x.port.dispose();
  },
);
it("keeps the original XML output and delivery ID during uncertain recovery", async () => {
  const x = setup(),
    review = await x.prepare();
  x.setFail(true);
  await expect(x.port.publish(review, "xml", x.signal)).rejects.toThrow();
  await expect(x.port.publish(review, "docx", x.signal)).rejects.toThrow(
    "original",
  );
  expect(x.requests).toHaveLength(1);
  x.setFail(false);
  await x.port.publish(review, "xml", x.signal);
  expect(x.requests[1]).toEqual(x.requests[0]);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("settles an unadmitted PDF renderer refusal without producing a publication", async () => {
  const x = setup(),
    review = await x.prepare();
  await expect(x.port.publish(review, "pdf", x.signal)).rejects.toThrow(
    "not dispatched",
  );
  expect(x.requests).toHaveLength(1);
  expect(x.requests[0]!.output).toBe("pdf");
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("admits the trusted synthetic PDF specimen with its bound structural receipt", async () => {
  const x = setup("pdf"),
    review = await x.prepare();
  const published = await x.port.publish(review, "pdf", x.signal);
  expect(published.output).toBe("pdf");
  expect(published.publication.version.mimeType).toBe("application/pdf");
  expect(published.structuralReceipt).toEqual(
    pdfFixture.admittedPdf.exports.pdf.result.structuralReceipt,
  );
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("withholds a PDF response whose execution request receipt does not bind", async () => {
  const x = setup("pdf", "executionRequestSha256"),
    review = await x.prepare();
  await expect(x.port.publish(review, "pdf", x.signal)).rejects.toThrow();
  expect(x.attempt().status).toBe("unresolved");
  x.port.dispose();
});
it("preserves recovery custody for a structural Word READ_UNAVAILABLE refusal", async () => {
  const x = setup("unsupported"),
    review = await x.prepare();
  expect(review.prepared.draft.structuralProjection?.status).toBe(
    "unsupported",
  );
  await expect(x.port.publish(review, "docx", x.signal)).rejects.toThrow(
    "needs recovery",
  );
  expect(x.attempt().status).toBe("unresolved");
  await expect(x.port.publish(review, "xml", x.signal)).rejects.toThrow(
    "original",
  );
  expect(x.requests).toHaveLength(1);
  x.port.dispose();
});
it("admits XML for a review whose structural Word projection is unsupported", async () => {
  const x = setup("unsupported"),
    review = await x.prepare();
  const xml = await x.port.publish(review, "xml", x.signal);
  expect(xml.output).toBe("xml");
  expect(xml.publication.version.object.sha256).toBe(
    review.prepared.draft.outputHashes.consolidated,
  );
  x.port.dispose();
});
