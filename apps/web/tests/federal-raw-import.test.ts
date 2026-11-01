import { expect, it } from "vitest";
import { FederalWorkbenchAccess } from "../src/shared/meri-documents/federal-workbench";
import { federalTransport } from "../src/shared/meri-documents/workflow-transport";
import {
  idleDocumentAttempt,
  type DocumentAttempt,
} from "../src/shared/meri-documents/attempt-journal";
import type { DocumentLibraryAccess } from "../src/shared/meri-documents/library-access";
import fixture from "./fixtures/federal-raw-source.json";
import schemaFixture from "./fixtures/federal-schema-source.json";
const representation = "retained-raw-utf8/1" as const;
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
function setup(
  scenario = fixture,
  mutate?: (value: typeof fixture.imported) => void,
) {
  let attempt: DocumentAttempt = idleDocumentAttempt,
    fail = false,
    unavailable = false,
    tamper = false;
  const requests: Array<Record<string, unknown>> = [];
  const version = scenario.imported.publication.version;
  const { publication: unused, ...envelope } = scenario.imported;
  void unused;
  const library = {
    dispose() {},
    inspect: async () => ({
      ok: true,
      value: {
        kind: "generated",
        mimeType: "text/plain",
        objectSha256: version.object.sha256,
      },
    }),
    download: async () => ({
      ok: true,
      value: {
        bytes: encode(envelope),
        filename: version.filename,
        mimeType: "text/plain",
      },
    }),
  } as unknown as DocumentLibraryAccess;
  const signal = new AbortController().signal;
  const transport = federalTransport(
    "action_session_" + "a".repeat(43),
    signal,
    async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      if (fail) throw Error("Synthetic acknowledgement lost");
      if (unavailable)
        return Response.json(
          { error: { code: "DRAFT_SOURCE_STALE", outcome: "NOT_DISPATCHED" } },
          { status: 409 },
        );
      const result = structuredClone(scenario.imported);
      if (tamper) result.capture.byteLength++;
      mutate?.(result);
      return Response.json(result);
    },
  );
  const port = new FederalWorkbenchAccess({
    library,
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
  return {
    port,
    requests,
    signal,
    attempt: () => attempt,
    setFail: (value: boolean) => {
      fail = value;
    },
    setUnavailable: () => {
      unavailable = true;
    },
    tamper: () => {
      tamper = true;
    },
  };
}
it("negotiates verified raw capture through the canonical receiver and reopens its exact retained envelope", async () => {
  const x = setup();
  const imported = await x.port.importSource(
    fixture.input.selection,
    x.signal,
    representation,
  );
  expect(x.requests[0]).toMatchObject({
    selection: fixture.input.selection,
    representation,
  });
  expect(imported.capture).toEqual(fixture.imported.capture);
  expect(imported.source.text).toBe(fixture.imported.source.text);
  expect(imported.source.sha256).toBe(fixture.imported.capture.sha256);
  const reopened = await x.port.source(imported.versionId, x.signal);
  expect(reopened.source).toEqual(imported.source);
  expect(reopened.sha256).toBe(imported.sha256);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("admits pinned schema validation and reopens the exact parser2 source and receipt", async () => {
  const x = setup(schemaFixture);
  const imported = await x.port.importSource(
    schemaFixture.input.selection,
    x.signal,
    representation,
    "uslm-2.1.0",
  );
  expect(x.requests[0]).toMatchObject({
    selection: schemaFixture.input.selection,
    representation,
    validationProfile: "uslm-2.1.0",
  });
  expect(imported.source).toEqual(schemaFixture.imported.source);
  expect(imported.capture).toEqual(schemaFixture.imported.capture);
  const reopened = await x.port.source(imported.versionId, x.signal);
  expect(reopened.source).toEqual(imported.source);
  expect(reopened.sha256).toBe(imported.sha256);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it.each([
  { schemaSha256: "0".repeat(64) },
  { sourceSha256: "0".repeat(64) },
  { bytes: 1 },
  { valid: false },
])("withholds a schema receipt with altered %j", async (alteration) => {
  const x = setup(schemaFixture, (result) => {
    Object.assign(result.source, {
      validation: {
        ...schemaFixture.imported.source.validation,
        ...alteration,
      },
    });
  });
  await expect(
    x.port.importSource(
      schemaFixture.input.selection,
      x.signal,
      representation,
      "uslm-2.1.0",
    ),
  ).rejects.toThrow();
  expect(x.attempt().status).toBe("unresolved");
  expect(x.requests).toHaveLength(1);
  x.port.dispose();
});
it("keeps requested representation and delivery identity on unknown recovery", async () => {
  const x = setup();
  x.setFail(true);
  await expect(
    x.port.importSource(fixture.input.selection, x.signal, representation),
  ).rejects.toThrow();
  const original = x.requests[0];
  await expect(
    x.port.importSource(fixture.input.selection, x.signal),
  ).rejects.toThrow("original");
  expect(x.requests).toHaveLength(1);
  x.setFail(false);
  await x.port.importSource(fixture.input.selection, x.signal, representation);
  expect(x.requests[1]).toEqual(original);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("does not fall back when a qualified capture is unavailable", async () => {
  const x = setup();
  x.setUnavailable();
  await expect(
    x.port.importSource(fixture.input.selection, x.signal, representation),
  ).rejects.toThrow("official source");
  expect(x.requests).toHaveLength(1);
  expect(x.requests[0]!.representation).toBe(representation);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("withholds a corrupted capture and preserves its unresolved operation", async () => {
  const x = setup();
  x.tamper();
  await expect(
    x.port.importSource(fixture.input.selection, x.signal, representation),
  ).rejects.toThrow();
  expect(x.attempt().status).toBe("unresolved");
  expect(x.requests).toHaveLength(1);
  x.port.dispose();
});
it("refuses a validation profile without raw capture before dispatch", async () => {
  const x = setup();
  await expect(
    x.port.importSource(
      fixture.input.selection,
      x.signal,
      undefined,
      "uslm-2.1.0",
    ),
  ).rejects.toThrow();
  expect(x.requests).toHaveLength(0);
  expect(x.attempt().status).toBe("idle");
  x.port.dispose();
});
it("includes the schema profile in delivery identity and rejects a raw-only response", async () => {
  const x = setup();
  x.setFail(true);
  await expect(
    x.port.importSource(
      fixture.input.selection,
      x.signal,
      representation,
      "uslm-2.1.0",
    ),
  ).rejects.toThrow();
  expect(x.requests[0]).toMatchObject({
    representation,
    validationProfile: "uslm-2.1.0",
  });
  await expect(
    x.port.importSource(fixture.input.selection, x.signal, representation),
  ).rejects.toThrow("original");
  expect(x.requests).toHaveLength(1);
  x.setFail(false);
  await expect(
    x.port.importSource(
      fixture.input.selection,
      x.signal,
      representation,
      "uslm-2.1.0",
    ),
  ).rejects.toThrow();
  expect(x.requests[1]).toEqual(x.requests[0]);
  expect(x.attempt().status).toBe("unresolved");
  x.port.dispose();
});
