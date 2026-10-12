import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  binaryDownloadSchema,
  defineOperation,
  type MultipartPolicy,
} from "./contracts";
import { handleCapiroRequest } from "./gateway";
import { createCapiroApi } from "./http";
import { uploadCapiroAttachment, uploadCapiroLogo } from "./uploads";

const policy: MultipartPolicy = {
  files: [
    {
      field: "file",
      minCount: 1,
      maxCount: 1,
      maxBytes: 100,
      mimeTypes: ["application/pdf"],
    },
  ],
  bodyFields: { answers: "json" },
  maxFileBytes: 100,
  maxMetadataBytes: 1000,
  maxTotalBytes: 2000,
};
const registry = {
  "upload.file": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/forms/:id/submit",
    encoding: "multipart",
    multipart: policy,
    request: z
      .object({
        params: z.object({ id: z.string() }).strict(),
        body: z.object({ answers: z.record(z.string(), z.string()) }).strict(),
      })
      .strict(),
    response: z.object({ id: z.string() }),
    source: "test controller",
  }),
  "export.pdf": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:id/export/pdf",
    responseMode: "binary",
    binary: {
      contentTypes: ["application/pdf"],
      maxBytes: 100,
      filename: "draft.pdf",
    },
    request: z
      .object({ params: z.object({ id: z.string() }).strict() })
      .strict(),
    response: binaryDownloadSchema,
    source: "test controller",
  }),
  "hearing.ticket": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/hearings/:id/ws-ticket",
    request: z
      .object({ params: z.object({ id: z.string() }).strict() })
      .strict(),
    upstreamResponse: z.object({
      ticket: z.string().min(1),
      expiresAt: z.string(),
    }),
    response: z.object({
      ticket: z.string(),
      expiresAt: z.string(),
      socketUrl: z.url(),
    }),
    websocket: {
      path: "/live",
      sessionParam: "id",
      sessionQuery: "sessionId",
      ticketField: "ticket",
      ticketQuery: "ticket",
    },
    source: "test controller",
  }),
};
const config = {
  authConfigured: true,
  services: {
    strategy: "https://api.example.test/strategy-api",
    workspace: "https://api.example.test/workspace-api",
    intelligence: "https://intel.example.test/intel-api",
  },
  issues: [],
};
const input = {
  params: { id: "form-1" },
  body: { answers: { question: "Test answer" } },
};
const file = () =>
  new File(["%PDF-test"], "test.pdf", { type: "application/pdf" });
function upload(
  files: [string, File | string][] = [["file", file()]],
  metadata: unknown = input,
) {
  const form = new FormData();
  form.append("input", JSON.stringify(metadata));
  for (const [name, entry] of files) form.append(name, entry);
  return new Request("https://frontend.example.test/api/capiro/upload.file", {
    method: "POST",
    headers: { Origin: "https://frontend.example.test" },
    body: form,
  });
}

it("forwards the authorized multipart fields and derived bearer, with automatic multipart boundary", async () => {
  const fetcher = vi.fn(async () => Response.json({ id: "receipt-1" }));
  const response = await handleCapiroRequest(
    upload(),
    "upload.file",
    registry,
    config,
    async () => "trusted-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.href).toBe(
    "https://api.example.test/strategy-api/planner/forms/form-1/submit",
  );
  expect(init.headers).toEqual({
    Authorization: "Bearer trusted-token",
    Accept: "application/json",
  });
  const body = init.body as FormData;
  expect(body.get("answers")).toBe('{"question":"Test answer"}');
  expect(body.get("input")).toBeNull();
  expect(body.get("file")).toBeInstanceOf(File);
});
it("rejects undeclared fields, oversize files, duplicate files and authority metadata before token/network", async () => {
  const auth = vi.fn();
  const fetcher = vi.fn();
  const cases = [
    upload([["unapproved", file()]]),
    upload([["file", "pretend-file"]]),
    upload([
      [
        "file",
        new File(["x".repeat(101)], "large.pdf", { type: "application/pdf" }),
      ],
    ]),
    upload([
      ["file", file()],
      ["file", file()],
    ]),
    upload([["file", file()]], { ...input, tenantId: "untrusted" }),
  ];
  for (const request of cases)
    expect(
      (
        await handleCapiroRequest(
          request,
          "upload.file",
          registry,
          config,
          auth,
          fetcher,
        )
      ).status,
    ).toBe(400);
  expect(auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
it("browser upload validates file policy and does not expose bearer or manually set multipart Content-Type", async () => {
  const fetcher = vi.fn(async () => Response.json({ id: "receipt" }));
  const api = createCapiroApi(registry, { fetcher });
  await api.upload("upload.file", input, [{ field: "file", file: file() }]);
  const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(init.headers).toBeUndefined();
  expect(init.credentials).toBe("same-origin");
  expect((init.body as FormData).get("input")).toBe(JSON.stringify(input));
  await expect(
    api.upload("upload.file", input, [{ field: "other", file: file() }]),
  ).rejects.toMatchObject({ status: 400 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("bounds binary MIME/size and returns an opaque download with a safe registered filename", async () => {
  const request = () =>
    new Request(
      "https://frontend.example.test/api/capiro/export.pdf?input=%7B%22params%22%3A%7B%22id%22%3A%22draft-1%22%7D%7D",
    );
  const pdf = () =>
    new Response("%PDF-test", {
      headers: {
        "Content-Type": "application/pdf",
        "Set-Cookie": "secret=x",
        "Content-Disposition": 'attachment; filename="untrusted.html"',
      },
    });
  const response = await handleCapiroRequest(
    request(),
    "export.pdf",
    registry,
    config,
    async () => "trusted",
    async () => pdf(),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toBe(
    'attachment; filename="draft.pdf"',
  );
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const api = createCapiroApi(registry, { fetcher: async () => pdf() });
  const download = await api.download("export.pdf", {
    params: { id: "draft-1" },
  });
  expect(download.filename).toBe("draft.pdf");
  expect(await download.blob.text()).toBe("%PDF-test");
  expect(
    (
      await handleCapiroRequest(
        request(),
        "export.pdf",
        registry,
        config,
        async () => "trusted",
        async () =>
          new Response("<script>bad</script>", {
            headers: { "Content-Type": "text/html" },
          }),
      )
    ).status,
  ).toBe(502);
  expect(
    (
      await handleCapiroRequest(
        request(),
        "export.pdf",
        registry,
        config,
        async () => "trusted",
        async () =>
          new Response("x".repeat(101), {
            headers: { "Content-Type": "application/pdf" },
          }),
      )
    ).status,
  ).toBe(502);
});
it("only hands off a reviewed hearing socket derived from the configured service and single-use ticket", async () => {
  const request = new Request(
    "https://frontend.example.test/api/capiro/hearing.ticket",
    {
      method: "POST",
      headers: {
        Origin: "https://frontend.example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ params: { id: "hearing-1" } }),
    },
  );
  const response = await handleCapiroRequest(
    request,
    "hearing.ticket",
    registry,
    config,
    async () => "trusted",
    async () =>
      Response.json({
        ticket: "single-use-ticket",
        expiresAt: "2026-10-11T19:00:00Z",
      }),
  );
  expect(await response.json()).toEqual({
    ticket: "single-use-ticket",
    expiresAt: "2026-10-11T19:00:00Z",
    socketUrl:
      "wss://intel.example.test/intel-api/live?ticket=single-use-ticket&sessionId=hearing-1",
  });
  expect(() =>
    defineOperation({ ...registry["hearing.ticket"], service: "core" }),
  ).toThrow("reviewed Intelligence");
});
it("presigned logo upload omits all credentials and rejects an arbitrary destination", async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
  const logo = new File(["test-image"], "logo.png", { type: "image/png" });
  const ticket = {
    url: "https://tenant-assets.s3.us-east-1.amazonaws.com/",
    s3Key: "tenants/test/logo.png",
    fields: { key: "tenants/test/logo.png", policy: "test-signed-policy" },
  };
  await uploadCapiroLogo(ticket, logo, { fetcher });
  const [, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(init.credentials).toBe("omit");
  expect(init.headers).toBeUndefined();
  await expect(
    uploadCapiroLogo(
      { ...ticket, url: "https://untrusted.example.test/" },
      logo,
      { fetcher },
    ),
  ).rejects.toMatchObject({ status: 502 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("preserves the separate attachment type policy, rejects scriptable SVG essence and signed type mismatches", async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
  const ticket = {
    url: "https://tenant-assets.s3.us-east-1.amazonaws.com/",
    s3Key: "tenants/test/document.pdf",
    fields: {
      key: "tenants/test/document.pdf",
      "Content-Type": "application/pdf",
    },
  };
  await uploadCapiroAttachment(ticket, file(), { fetcher });
  await expect(
    uploadCapiroAttachment(
      ticket,
      new File(["<svg/>"], "unsafe.svg", {
        type: "image/svg+xml; charset=utf-8",
      }),
      { fetcher },
    ),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    uploadCapiroAttachment(
      ticket,
      new File(["text"], "text.txt", { type: "text/plain" }),
      { fetcher },
    ),
  ).rejects.toMatchObject({ status: 502 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
