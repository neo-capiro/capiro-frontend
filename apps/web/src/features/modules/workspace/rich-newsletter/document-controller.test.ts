import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createRichWriteJournal } from "./write-journal";
import {
  createNewsletterLayout,
  defaultNewsletterConfig,
  type NewsletterCampaign,
} from "@capiro/shared/newsletter";
import { createCapiroApi } from "../../../../shared/capiro/http";
import { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";
import { richNewsletterOperations } from "../../../../shared/capiro/operations/rich-newsletter";
import {
  createRichDocumentController,
  hasRichChanges,
  stageAttempt,
} from "./document-controller";

const id = "b2222222-2222-7222-8222-222222222222";
const clientId = "e5555555-5555-4555-8555-555555555555";
const stageId = "a1111111-1111-4111-8111-111111111111";
const different = "d4444444-4444-4444-8444-444444444444";
function campaign(revision = 4): NewsletterCampaign {
  return {
    id,
    revision,
    name: "Synthetic saved newsletter",
    status: "draft",
    ownerId: "user_synthetic",
    updatedAt: "2026-10-13T02:00:00.000Z",
    config: { ...defaultNewsletterConfig(), clientId },
    design: createNewsletterLayout(1),
  };
}
function receipt(revision = 4) {
  return {
    id: stageId,
    documentId: id,
    revision,
    name: "Synthetic stage",
    createdAt: "2026-10-13T02:00:00.000Z",
    route: `/engagement/outreach?newsletterStage=${stageId}`,
  };
}
const previewReceipt = () => ({
  documentId: id,
  revision: 4,
  renderHash: "a".repeat(64),
  hashFormat: "newsletter-render-json-v1",
  html: "<p>Saved</p>",
  plainText: "Saved",
  checks: [],
});
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
function setup(queryClient = new QueryClient()) {
  const fetcher = vi.fn<typeof fetch>();
  const adapter = createRichNewsletterAdapter(
    createCapiroApi(richNewsletterOperations, { fetcher }),
  );
  const journal = createRichWriteJournal(queryClient);
  const owner = createRichDocumentController(adapter, journal);
  const dispose = owner.mount();
  const reply = (value: unknown, status = 200) =>
    fetcher.mockResolvedValueOnce(Response.json(value, { status }));
  const open = async (value = campaign()) => {
    reply({ items: [value] });
    await owner.list();
    reply(value);
    await owner.open(value.id);
    owner.adopt();
    return value;
  };
  return { owner, fetcher, reply, open, dispose, queryClient, journal };
}
const input = (fetcher: ReturnType<typeof setup>["fetcher"], index: number) =>
  JSON.parse(String(fetcher.mock.calls[index]![1]?.body));

describe("explicit rich saved-document intent", () => {
  it("construction, mounting, editing and history issue no owner request", () => {
    const { owner, fetcher } = setup();
    owner.edit((draft) => ({ ...draft, name: "Local" }));
    owner.undo();
    owner.redo();
    expect(fetcher).not.toHaveBeenCalled();
    expect(owner.getSnapshot().draft.name).toBe("Local");
    expect(owner.getSnapshot().current).toBe(false);
  });
  it("loads only on explicit intent, reads a listed identity and requires separate adoption", async () => {
    const { owner, fetcher, reply } = setup();
    const saved = campaign();
    reply({ items: [saved] });
    await owner.list();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(owner.getSnapshot().saved).toBeUndefined();
    expect(owner.getSnapshot().draft.name).toBe("Untitled newsletter");
    await owner.open(different);
    expect(fetcher).toHaveBeenCalledTimes(1);
    reply(saved);
    await owner.open(id);
    expect(owner.getSnapshot().review).toEqual(saved);
    expect(owner.getSnapshot().current).toBe(false);
    owner.adopt();
    expect(owner.getSnapshot().saved).toEqual(saved);
    expect(hasRichChanges(owner.getSnapshot())).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("creates with the actual DTO only and preserves local content for a later explicit CAS save", async () => {
    const { owner, fetcher, reply } = setup();
    owner.edit((draft) => ({
      ...draft,
      name: "My draft",
      config: { ...draft.config, subject: "Local subject" },
    }));
    const local = structuredClone(owner.getSnapshot().draft);
    reply(campaign());
    await owner.create();
    expect(input(fetcher, 0)).toEqual({ body: { name: "My draft" } });
    expect(owner.getSnapshot().draft).toEqual(local);
    expect(owner.getSnapshot().saved?.id).toBe(id);
    expect(hasRichChanges(owner.getSnapshot())).toBe(true);
    await owner.create();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("holds one dispatch and locks all local edits/history while its submitted draft is in flight", async () => {
    const { owner, fetcher, open } = setup();
    const saved = await open();
    owner.edit((draft) => ({ ...draft, name: "Submitted" }));
    const draft = structuredClone(owner.getSnapshot().draft);
    const held = deferred();
    fetcher.mockReturnValueOnce(held.promise);
    const pending = owner.save();
    owner.edit((value) => ({ ...value, name: "Late" }));
    owner.undo();
    owner.redo();
    await owner.save();
    await owner.list();
    await owner.stage();
    await owner.readback();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(input(fetcher, 2)).toEqual({
      params: { id },
      body: { ...draft, revision: saved.revision },
    });
    expect(owner.getSnapshot().draft).toEqual(draft);
    held.resolve(Response.json({ ...saved, ...draft, revision: 5 }));
    await pending;
    expect(owner.getSnapshot().draft.name).toBe("Submitted");
    expect(owner.getSnapshot().saved?.revision).toBe(5);
    expect(hasRichChanges(owner.getSnapshot())).toBe(false);
  });
});

describe("uncertain writes and deliberate review", () => {
  it.each([409, 503])(
    "preserves full local state after save status%s until current read and explicit rebase",
    async (status) => {
      const { owner, fetcher, reply, open } = setup();
      await open();
      owner.edit((draft) => ({
        ...draft,
        name: "Keep this work",
        config: { ...draft.config, subject: "Local subject" },
      }));
      const local = structuredClone(owner.getSnapshot().draft);
      reply({ message: "Synthetic refusal" }, status);
      await owner.save();
      expect(owner.getSnapshot().draft).toEqual(local);
      expect(owner.getSnapshot().fence).toBe(
        status === 409 ? "conflict" : "save",
      );
      await owner.save();
      await owner.stage();
      expect(fetcher).toHaveBeenCalledTimes(3);
      const current = campaign(7);
      reply(current);
      await owner.readback();
      expect(owner.getSnapshot().review).toEqual(current);
      expect(owner.getSnapshot().draft).toEqual(local);
      await owner.save();
      expect(fetcher).toHaveBeenCalledTimes(4);
      owner.rebase();
      expect(owner.getSnapshot().draft).toEqual(local);
      expect(owner.getSnapshot().saved?.revision).toBe(7);
      expect(owner.getSnapshot().notice).toMatch(
        /full name, configuration and design/,
      );
      reply({ ...current, ...local, revision: 8 });
      await owner.save();
      expect(input(fetcher, 4).body).toEqual({ ...local, revision: 7 });
      expect(owner.getSnapshot().saved?.revision).toBe(8);
    },
  );
  it("requires explicit adoption to discard edits after readback and never attributes the state to a failed attempt", async () => {
    const { owner, reply, open } = setup();
    await open();
    owner.edit((draft) => ({ ...draft, name: "Private draft" }));
    reply({}, 503);
    await owner.save();
    reply(campaign(6));
    await owner.readback();
    expect(owner.getSnapshot().draft.name).toBe("Private draft");
    expect(owner.getSnapshot().notice).toMatch(/does not confirm/);
    owner.adopt();
    expect(owner.getSnapshot().draft.name).toBe("Synthetic saved newsletter");
    expect(owner.getSnapshot().past).toEqual([]);
    expect(owner.getSnapshot().notice).toMatch(/does not confirm/);
  });
  it("never retries unknown creation, including after an empty list; known detail adoption resumes work only", async () => {
    const { owner, fetcher, reply, open } = setup();
    reply({}, 503);
    await owner.create();
    await owner.create();
    expect(owner.getSnapshot().fence).toBe("create");
    expect(fetcher).toHaveBeenCalledTimes(1);
    reply({ items: [] });
    await owner.list();
    await owner.create();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(owner.getSnapshot().fence).toBe("create");
    await open();
    expect(owner.getSnapshot().current).toBe(true);
    expect(owner.getSnapshot().notice).toMatch(/does not confirm/);
    await owner.create();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it.each(["document", "revision", "client", "malformed"])(
    "fences an unbound save receipt: %s",
    async (kind) => {
      const { owner, reply, open } = setup();
      const saved = await open();
      owner.edit((draft) => ({ ...draft, name: "Retained" }));
      const local = structuredClone(owner.getSnapshot().draft);
      const result = { ...saved, ...local, revision: 5 };
      if (kind === "document") result.id = different;
      if (kind === "revision") result.revision = 6;
      if (kind === "client")
        result.config = { ...result.config, clientId: different };
      reply(kind === "malformed" ? { data: result } : result);
      await owner.save();
      expect(owner.getSnapshot().fence).toBe("save");
      expect(owner.getSnapshot().draft).toEqual(local);
      expect(owner.getSnapshot().saved?.revision).toBe(4);
    },
  );
});

describe("current reads, preview and stage receipt boundaries", () => {
  it("keeps uncertain stage identity across equivalent UUID spelling in deliberate readback", async () => {
    const { owner, fetcher, reply, open } = setup();
    const saved = await open();
    reply({}, 503);
    await owner.stage();
    reply({ ...saved, id: saved.id.toUpperCase() });
    await owner.readback();
    owner.adopt();
    await owner.stage();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(stageAttempt(owner.getSnapshot())?.status).toBe("unknown");
  });
  it.each([403, 503])(
    "failed current read%s hides library/review/preview and disables writes without erasing local edits",
    async (status) => {
      const { owner, fetcher, reply, open } = setup();
      await open();
      reply(previewReceipt());
      await owner.preview();
      owner.edit((draft) => ({ ...draft, name: "Local survives" }));
      reply({}, status);
      await owner.list();
      expect(owner.getSnapshot()).toMatchObject({
        current: false,
        draft: { name: "Local survives" },
      });
      expect(owner.getSnapshot().items).toBeUndefined();
      expect(owner.getSnapshot().preview).toBeUndefined();
      await owner.save();
      await owner.stage();
      await owner.open(id);
      expect(fetcher).toHaveBeenCalledTimes(4);
    },
  );
  it("refuses wrong-client current detail and does not substitute list data as an actionable document", async () => {
    const { owner, reply } = setup();
    const saved = campaign();
    reply({ items: [saved] });
    await owner.list();
    reply({ ...saved, config: { ...saved.config, clientId: different } });
    await owner.open(id);
    expect(owner.getSnapshot().review).toBeUndefined();
    expect(owner.getSnapshot().current).toBe(false);
    owner.adopt();
    expect(owner.getSnapshot().saved).toBeUndefined();
  });
  it("explicit saved preview uses no local body or invented revision token and clears before a new current read", async () => {
    const { owner, fetcher, reply, open } = setup();
    await open();
    owner.edit((draft) => ({ ...draft, name: "Unsaved" }));
    const preview = {
      ...previewReceipt(),
      html: "<script>untrusted()</script><p>Saved</p>",
      plainText: "Saved",
      checks: [],
    };
    reply(preview);
    await owner.preview();
    expect(input(fetcher, 2)).toEqual({
      params: { id },
      body: { liveMergeTags: false },
    });
    expect(owner.getSnapshot().preview).toEqual(preview);
    const held = deferred();
    fetcher.mockReturnValueOnce(held.promise);
    const reading = owner.readback();
    expect(owner.getSnapshot().preview).toBeUndefined();
    expect(owner.getSnapshot().current).toBe(false);
    held.resolve(Response.json(campaign(5)));
    await reading;
  });
  it("holds unknown staging for the exact revision through readback/adoption, allowing only a later saved revision", async () => {
    const { owner, fetcher, reply, open } = setup();
    const saved = await open();
    reply({}, 503);
    await owner.stage();
    await owner.stage();
    expect(stageAttempt(owner.getSnapshot())?.status).toBe("unknown");
    reply(saved);
    await owner.readback();
    owner.adopt();
    await owner.stage();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(owner.getSnapshot().stage).toBeUndefined();
    owner.edit((draft) => ({ ...draft, name: "New revision" }));
    reply({ ...saved, ...owner.getSnapshot().draft, revision: 5 });
    await owner.save();
    reply(receipt(5));
    await owner.stage();
    await owner.stage();
    expect(owner.getSnapshot().stage).toEqual(receipt(5));
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(input(fetcher, 5)).toEqual({
      params: { id },
      body: { revision: 5 },
    });
    expect(
      fetcher.mock.calls.every(([url]) => !String(url).includes("engagement")),
    ).toBe(true);
  });
  it("blocks staging unsaved changes and treats malformed stage receipts as uncertainty", async () => {
    const { owner, fetcher, reply, open } = setup();
    await open();
    owner.edit((draft) => ({ ...draft, name: "Local" }));
    await owner.stage();
    expect(fetcher).toHaveBeenCalledTimes(2);
    owner.undo();
    reply(receipt(3));
    await owner.stage();
    expect(owner.getSnapshot().fence).toBe("stage");
    expect(owner.getSnapshot().stage).toBeUndefined();
  });
});

describe("scope and attempt disposal", () => {
  it.each(["save", "stage"] as const)(
    "disposes a held %s receipt and cannot overwrite a replacement draft",
    async (action) => {
      const { owner, fetcher, open, dispose } = setup();
      const saved = await open();
      if (action === "save")
        owner.edit((draft) => ({
          ...draft,
          name: "Submitted private content",
        }));
      const held = deferred();
      fetcher.mockReturnValueOnce(held.promise);
      const pending = owner[action]();
      dispose();
      owner.mount();
      owner.edit((draft) => ({ ...draft, name: "New scope" }));
      held.resolve(
        Response.json(
          action === "save" ? { ...saved, revision: 5 } : receipt(),
        ),
      );
      await pending;
      expect(owner.getSnapshot().draft.name).toBe("New scope");
      expect(owner.getSnapshot().saved).toBeUndefined();
      expect(owner.getSnapshot().stage).toBeUndefined();
      expect(owner.getSnapshot().writes.stages).toHaveLength(
        action === "stage" ? 1 : 0,
      );
      expect(owner.getSnapshot().error).toBeUndefined();
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );
  it.each([200, 403, 503])(
    "ignores late create status%s after view replacement and clears every private projection",
    async (status) => {
      const { owner, fetcher, dispose } = setup();
      owner.edit((draft) => ({ ...draft, name: "Former private draft" }));
      const held = deferred();
      fetcher.mockReturnValueOnce(held.promise);
      const pending = owner.create();
      const signal = fetcher.mock.calls[0]![1]!.signal!;
      dispose();
      owner.mount();
      expect(signal.aborted).toBe(true);
      held.resolve(Response.json(status === 200 ? campaign() : {}, { status }));
      await pending;
      expect(owner.getSnapshot().draft.name).toBe("Untitled newsletter");
      expect(owner.getSnapshot()).toMatchObject({
        current: false,
        past: [],
        future: [],
      });
      for (const key of [
        "saved",
        "items",
        "review",
        "preview",
        "stage",
        "pending",
        "fence",
        "error",
      ] as const)
        expect(owner.getSnapshot()[key]).toBeUndefined();
    },
  );
  it("ignores a held preview after disposal and never starts an owner call from a replacement mount", async () => {
    const { owner, fetcher, open, dispose } = setup();
    await open();
    const held = deferred();
    fetcher.mockReturnValueOnce(held.promise);
    const preview = owner.preview();
    dispose();
    owner.mount();
    held.resolve(
      Response.json({
        ...previewReceipt(),
        html: "private",
        plainText: "private",
      }),
    );
    await preview;
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(owner.getSnapshot().preview).toBeUndefined();
  });
});

describe("request-bound preview and explicit exact-stage recovery", () => {
  it("rejects a newer preview without adopting it or changing local edits", async () => {
    const fixture = setup();
    await fixture.open();
    fixture.owner.edit((draft) => ({ ...draft, name: "Local retained" }));
    fixture.reply({ ...previewReceipt(), revision: 5 });
    await fixture.owner.preview();
    expect(fixture.owner.getSnapshot().preview).toBeUndefined();
    expect(fixture.owner.getSnapshot().saved?.revision).toBe(4);
    expect(fixture.owner.getSnapshot().draft.name).toBe("Local retained");
    expect(fixture.owner.getSnapshot().current).toBe(false);
  });
  it.each([false, true])(
    "recovers only the retained revision while preserving the baseline (newer adopted: %s)",
    async (newer) => {
      const fixture = setup();
      await fixture.open();
      fixture.reply({}, 503);
      await fixture.owner.stage();
      const attempt = fixture.journal.read().stages[0]!;
      if (newer) {
        fixture.reply(campaign(7));
        await fixture.owner.readback();
        fixture.owner.adopt();
      }
      const before = fixture.owner.getSnapshot();
      const start = fixture.fetcher.mock.calls.length;
      fixture.reply(receipt());
      await fixture.owner.recoverStage(attempt.attempt);
      expect(fixture.owner.getSnapshot().stage).toEqual(receipt());
      expect(fixture.owner.getSnapshot().saved).toEqual(before.saved);
      expect(fixture.owner.getSnapshot().current).toBe(before.current);
      expect(fixture.owner.getSnapshot().fence).toBe(before.fence);
      expect(fixture.journal.read().stages[0]?.status).toBe("confirmed");
      expect(fixture.owner.getSnapshot().notice).toContain(
        "does not establish which earlier request",
      );
      expect(fixture.fetcher.mock.calls.slice(start)).toHaveLength(1);
      const [url, options] = fixture.fetcher.mock.calls[start]!;
      expect(options?.method).toBe("GET");
      expect(decodeURIComponent(String(url))).toContain(
        JSON.stringify({ params: { id, revision: 4 } }),
      );
      if (!newer) await fixture.owner.stage();
      await fixture.owner.recoverStage(attempt.attempt);
      expect(fixture.fetcher.mock.calls.slice(start)).toHaveLength(1);
    },
  );
  it.each(["null", "denied", "wrong-revision"])(
    "keeps uncertainty after %s recovery and never redispatches",
    async (kind) => {
      const fixture = setup();
      await fixture.open();
      fixture.reply({}, 503);
      await fixture.owner.stage();
      const before = fixture.journal.read();
      fixture.reply(
        kind === "null" ? null : kind === "denied" ? {} : receipt(5),
        kind === "denied" ? 403 : 200,
      );
      await fixture.owner.recoverStage(before.stages[0]!.attempt);
      await fixture.owner.stage();
      expect(fixture.journal.read()).toEqual(before);
      expect(fixture.owner.getSnapshot()).toMatchObject({
        current: false,
        fence: "stage",
      });
      expect(fixture.owner.getSnapshot().stage).toBeUndefined();
      expect(fixture.fetcher).toHaveBeenCalledTimes(4);
      expect(fixture.fetcher.mock.calls[3]![1]?.method).toBe("GET");
      if (kind === "null")
        expect(fixture.owner.getSnapshot().notice).toContain(
          "remains uncertain",
        );
      else expect(fixture.owner.getSnapshot().error).toContain("lookup failed");
    },
  );
  it.each([409, 503])(
    "does not settle unknown creation or save status %s while recovering a stage",
    async (status) => {
      const fixture = setup();
      fixture.reply({}, 503);
      await fixture.owner.create();
      await fixture.open();
      fixture.reply({}, 503);
      await fixture.owner.stage();
      fixture.reply(campaign(7));
      await fixture.owner.readback();
      fixture.owner.adopt();
      fixture.owner.edit((draft) => ({ ...draft, name: "Keep me" }));
      fixture.reply({}, status);
      await fixture.owner.save();
      const before = fixture.owner.getSnapshot();
      fixture.reply(receipt());
      await fixture.owner.recoverStage(before.writes.stages[0]!.attempt);
      expect(fixture.owner.getSnapshot().stage).toEqual(receipt());
      expect(fixture.owner.getSnapshot().fence).toBe(before.fence);
      expect(fixture.owner.getSnapshot().current).toBe(false);
      expect(fixture.owner.getSnapshot().draft).toEqual(before.draft);
      expect(fixture.journal.read().create).toEqual(before.writes.create);
      expect(fixture.journal.read().saves).toEqual(before.writes.saves);
    },
  );
  it.each(["unmount", "clear", "notification-unmount", "notification-replace"])(
    "ignores recovery after %s",
    async (mode) => {
      const fixture = setup();
      await fixture.open();
      fixture.reply({}, 503);
      await fixture.owner.stage();
      const attempt = fixture.journal.read().stages[0]!;
      const held = deferred();
      fixture.fetcher.mockReturnValueOnce(held.promise);
      const pending = fixture.owner.recoverStage(attempt.attempt);
      if (mode === "unmount") fixture.dispose();
      if (mode === "clear") fixture.queryClient.clear();
      if (mode.startsWith("notification")) {
        const unsubscribe = fixture.journal.subscribe(() => {
          if (fixture.journal.read().stages[0]?.status !== "confirmed") return;
          unsubscribe();
          if (mode === "notification-unmount") fixture.dispose();
          else {
            fixture.queryClient.clear();
            const replacement = fixture.journal.begin({
              kind: "stage",
              documentId: different,
              revision: 4,
            });
            fixture.journal.finish(replacement!, "confirmed");
          }
        });
      }
      held.resolve(Response.json(receipt()));
      await pending;
      expect(fixture.owner.getSnapshot().stage).toBeUndefined();
      expect(fixture.owner.getSnapshot().notice).toBeUndefined();
      expect(fixture.fetcher).toHaveBeenCalledTimes(4);
      if (mode === "notification-replace")
        expect(fixture.journal.read().stages[0]).toMatchObject({
          documentId: different,
          status: "confirmed",
        });
    },
  );
});

describe("same-scope navigation write journal", () => {
  it("fences create before transport and retains uncertainty through close/reopen and known-document adoption", async () => {
    const first = setup();
    first.owner.edit((draft) => ({ ...draft, name: "Private submitted name" }));
    const held = deferred();
    first.fetcher.mockImplementationOnce(() => {
      expect(first.journal.read().create?.status).toBe("pending");
      return held.promise;
    });
    const pending = first.owner.create();
    first.dispose();
    const second = setup(first.queryClient);
    expect(second.owner.getSnapshot().draft.name).toBe("Untitled newsletter");
    expect(second.journal.read().create?.status).toBe("unknown");
    await second.owner.create();
    expect(second.fetcher).not.toHaveBeenCalled();
    second.reply({ items: [] });
    await second.owner.list();
    await second.owner.create();
    expect(second.fetcher).toHaveBeenCalledTimes(1);
    await second.open();
    expect(second.journal.read().create?.status).toBe("unknown");
    held.resolve(Response.json(campaign()));
    await pending;
    expect(second.journal.read().create?.status).toBe("unknown");
    second.dispose();
    const third = setup(first.queryClient);
    await third.owner.create();
    expect(third.fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(third.journal.read())).not.toContain(
      "Private submitted name",
    );
  });
  it("keeps an in-flight stage fenced across new view readback, including equivalent UUID case", async () => {
    const first = setup();
    const saved = await first.open();
    const held = deferred();
    first.fetcher.mockReturnValueOnce(held.promise);
    const pending = first.owner.stage();
    expect(first.journal.read().stages[0]?.status).toBe("pending");
    first.dispose();
    const second = setup(first.queryClient);
    await second.open({ ...saved, id: saved.id.toUpperCase() });
    await second.owner.stage();
    expect(second.fetcher).toHaveBeenCalledTimes(2);
    expect(stageAttempt(second.owner.getSnapshot())?.status).toBe("unknown");
    held.resolve(Response.json(receipt()));
    await pending;
    expect(second.owner.getSnapshot().stage).toBeUndefined();
    expect(stageAttempt(second.owner.getSnapshot())?.status).toBe("unknown");
  });
  it("requires a successful owner read and explicit adoption to resume an uncertain save after reopening", async () => {
    const first = setup();
    const saved = await first.open();
    first.owner.edit((draft) => ({ ...draft, name: "Former local edits" }));
    first.reply({}, 503);
    await first.owner.save();
    first.dispose();
    const second = setup(first.queryClient);
    second.reply({ items: [saved] });
    await second.owner.list();
    second.reply({}, 403);
    await second.owner.open(id);
    second.owner.adopt();
    expect(second.journal.read().saves[0]?.status).toBe("unknown");
    second.reply(saved);
    await second.owner.open(id);
    expect(second.journal.read().saves[0]?.status).toBe("unknown");
    second.owner.adopt();
    expect(second.journal.read().saves[0]?.status).toBe("reviewed");
    second.owner.edit((draft) => ({ ...draft, name: "New explicit save" }));
    second.reply({
      ...saved,
      ...second.owner.getSnapshot().draft,
      revision: 5,
    });
    await second.owner.save();
    expect(second.journal.read().saves.map((entry) => entry.status)).toEqual([
      "reviewed",
      "confirmed",
    ]);
    expect(input(second.fetcher, 3).body.revision).toBe(4);
  });
  it.each(["dispose-first", "clear-first"])(
    "new canonical scope clears old fences and cannot receive a late old write outcome (%s)",
    async (order) => {
      const first = setup();
      const held = deferred();
      first.fetcher.mockReturnValueOnce(held.promise);
      const pending = first.owner.create();
      if (order === "clear-first") first.queryClient.clear();
      first.dispose();
      if (order === "dispose-first") first.queryClient.clear();
      const next = setup(new QueryClient());
      expect(next.journal.read()).toMatchObject({
        sequence: 0,
        saves: [],
        stages: [],
      });
      expect(next.journal.read().create).toBeUndefined();
      expect(next.fetcher).not.toHaveBeenCalled();
      next.reply(campaign());
      await next.owner.create();
      held.resolve(Response.json({}, { status: 503 }));
      await pending;
      expect(next.owner.getSnapshot().saved?.id).toBe(id);
      expect(next.owner.getSnapshot().error).toBeUndefined();
      expect(first.queryClient.getQueryCache().getAll()).toEqual([]);
    },
  );
  it("journal survives inactive views without a fetcher, retry or garbage-collection timeout", async () => {
    const fixture = setup();
    fixture.reply({}, 503);
    await fixture.owner.create();
    fixture.dispose();
    const query = fixture.queryClient.getQueryCache().getAll()[0]!;
    expect(query.options.gcTime).toBe(Infinity);
    expect(query.options.retry).toBe(false);
    expect(query.isDisabled()).toBe(true);
    await fixture.queryClient.refetchQueries();
    expect(query.state.fetchStatus).toBe("idle");
    expect(fixture.fetcher).toHaveBeenCalledTimes(1);
    expect(fixture.journal.read().create?.status).toBe("unknown");
  });
  it("disposal during synchronous fence publication cannot dispatch or erase the fence", async () => {
    const fixture = setup();
    const unsubscribe = fixture.owner.subscribe(() => {
      if (fixture.journal.read().create?.status === "pending") {
        unsubscribe();
        fixture.dispose();
      }
    });
    await fixture.owner.create();
    expect(fixture.fetcher).not.toHaveBeenCalled();
    expect(fixture.journal.read().create?.status).toBe("unknown");
    expect(fixture.owner.getSnapshot().pending).toBeUndefined();
  });
  it.each([200, 503])(
    "disposal during stage journal settlement cannot restore private receipt/error state (%s)",
    async (status) => {
      const fixture = setup();
      await fixture.open();
      const unsubscribe = fixture.owner.subscribe(() => {
        const outcome = fixture.journal.read().stages[0]?.status;
        if (outcome === "confirmed" || outcome === "unknown") {
          unsubscribe();
          fixture.dispose();
        }
      });
      fixture.reply(status === 200 ? receipt() : {}, status);
      await fixture.owner.stage();
      expect(fixture.owner.getSnapshot().stage).toBeUndefined();
      expect(fixture.owner.getSnapshot().error).toBeUndefined();
      expect(fixture.owner.getSnapshot().saved).toBeUndefined();
      expect(fixture.owner.getSnapshot().current).toBe(false);
      expect(fixture.journal.read().stages[0]?.status).toBe("unknown");
    },
  );
});
