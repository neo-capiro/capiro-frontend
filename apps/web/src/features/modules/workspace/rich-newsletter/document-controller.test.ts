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
async function setup(queryClient = new QueryClient()) {
  const fetcher = vi.fn<typeof fetch>();
  const adapter = createRichNewsletterAdapter(
    createCapiroApi(richNewsletterOperations, { fetcher }),
  );
  const journal = createRichWriteJournal(queryClient);
  const recovery = {
    hydrate: vi.fn(async () => null),
    dispatch: vi.fn(),
    reconcile: vi.fn(),
    resolve: vi.fn(),
  };
  const owner = createRichDocumentController(adapter, journal, recovery);
  const dispose = owner.mount();
  await vi.waitFor(() =>
    expect(owner.getSnapshot().recovery.phase).toBe("ready"),
  );
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
const input = (
  fetcher: Awaited<ReturnType<typeof setup>>["fetcher"],
  index: number,
) => JSON.parse(String(fetcher.mock.calls[index]![1]?.body));

describe("explicit rich saved-document intent", () => {
  it("construction, mounting, editing and history issue no owner request", async () => {
    const { owner, fetcher } = await setup();
    owner.edit((draft) => ({ ...draft, name: "Local" }));
    owner.undo();
    owner.redo();
    expect(fetcher).not.toHaveBeenCalled();
    expect(owner.getSnapshot().draft.name).toBe("Local");
    expect(owner.getSnapshot().current).toBe(false);
  });
  it("loads only on explicit intent, reads a listed identity and requires separate adoption", async () => {
    const { owner, fetcher, reply } = await setup();
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
});

describe("current reads, preview and stage receipt boundaries", () => {
  it("keeps uncertain stage identity across equivalent UUID spelling in deliberate readback", async () => {
    const { owner, fetcher, reply, open } = await setup();
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
    "failed current read%s clears privileged projections on denial and otherwise retains local edits",
    async (status) => {
      const { owner, fetcher, reply, open } = await setup();
      await open();
      reply(previewReceipt());
      await owner.preview();
      owner.edit((draft) => ({ ...draft, name: "Local survives" }));
      reply({}, status);
      await owner.list();
      expect(owner.getSnapshot()).toMatchObject({
        current: false,
        draft: {
          name: status === 403 ? "Untitled newsletter" : "Local survives",
        },
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
    const { owner, reply } = await setup();
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
    const { owner, fetcher, reply, open } = await setup();
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
    const { owner, fetcher, reply, open } = await setup();
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
    reply({ ...saved, revision: 5 });
    await owner.readback();
    owner.adopt();
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
    const { owner, fetcher, reply, open } = await setup();
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
  it.each(["stage"] as const)(
    "disposes a held %s receipt and cannot overwrite a replacement draft",
    async (action) => {
      const { owner, fetcher, open, dispose } = await setup();
      await open();
      const held = deferred();
      fetcher.mockReturnValueOnce(held.promise);
      const pending = owner[action]();
      dispose();
      owner.mount();
      await vi.waitFor(() =>
        expect(owner.getSnapshot().recovery.phase).toBe("ready"),
      );
      owner.edit((draft) => ({ ...draft, name: "New scope" }));
      held.resolve(Response.json(receipt()));
      await pending;
      expect(owner.getSnapshot().draft.name).toBe("New scope");
      expect(owner.getSnapshot().saved).toBeUndefined();
      expect(owner.getSnapshot().stage).toBeUndefined();
      expect(owner.getSnapshot().writes.stages).toHaveLength(1);
      expect(owner.getSnapshot().error).toBeUndefined();
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );
  it("ignores a held preview after disposal and never starts an owner call from a replacement mount", async () => {
    const { owner, fetcher, open, dispose } = await setup();
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
    const fixture = await setup();
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
      const fixture = await setup();
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
      const fixture = await setup();
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
  it.each(["unmount", "clear", "notification-unmount", "notification-replace"])(
    "ignores recovery after %s",
    async (mode) => {
      const fixture = await setup();
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
  it("keeps an in-flight stage fenced across new view readback, including equivalent UUID case", async () => {
    const first = await setup();
    const saved = await first.open();
    const held = deferred();
    first.fetcher.mockReturnValueOnce(held.promise);
    const pending = first.owner.stage();
    expect(first.journal.read().stages[0]?.status).toBe("pending");
    first.dispose();
    const second = await setup(first.queryClient);
    await second.open({ ...saved, id: saved.id.toUpperCase() });
    await second.owner.stage();
    expect(second.fetcher).toHaveBeenCalledTimes(2);
    expect(stageAttempt(second.owner.getSnapshot())?.status).toBe("unknown");
    held.resolve(Response.json(receipt()));
    await pending;
    expect(second.owner.getSnapshot().stage).toBeUndefined();
    expect(stageAttempt(second.owner.getSnapshot())?.status).toBe("unknown");
  });
  it("journal survives inactive views without a fetcher, retry or garbage-collection timeout", async () => {
    const fixture = await setup();
    await fixture.open();
    fixture.reply({}, 503);
    await fixture.owner.stage();
    fixture.dispose();
    const query = fixture.queryClient.getQueryCache().getAll()[0]!;
    expect(query.options.gcTime).toBe(Infinity);
    expect(query.options.retry).toBe(false);
    expect(query.isDisabled()).toBe(true);
    await fixture.queryClient.refetchQueries();
    expect(query.state.fetchStatus).toBe("idle");
    expect(fixture.fetcher).toHaveBeenCalledTimes(3);
    expect(fixture.journal.read().stages[0]?.status).toBe("unknown");
  });
  it("disposal during synchronous fence publication cannot dispatch or erase the fence", async () => {
    const fixture = await setup();
    await fixture.open();
    const unsubscribe = fixture.owner.subscribe(() => {
      if (fixture.journal.read().stages[0]?.status === "pending") {
        unsubscribe();
        fixture.dispose();
      }
    });
    await fixture.owner.stage();
    expect(fixture.fetcher).toHaveBeenCalledTimes(2);
    expect(fixture.journal.read().stages[0]?.status).toBe("unknown");
    expect(fixture.owner.getSnapshot().pending).toBeUndefined();
  });
  it.each([200, 503])(
    "disposal during stage journal settlement cannot restore private receipt/error state (%s)",
    async (status) => {
      const fixture = await setup();
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
