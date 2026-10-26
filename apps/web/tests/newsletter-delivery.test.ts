import { describe, expect, it, vi } from "vitest";
import { createCapiroApi, type CapiroApi } from "../src/shared/capiro/http";
import type { capiroOperations } from "../src/shared/capiro/registry";
import { richNewsletterOperations } from "../src/shared/capiro/operations/rich-newsletter";
import { newsletterDeliveryOperations } from "../src/shared/capiro/operations/newsletter-delivery";
import { createNewsletterDeliveryApi } from "../src/features/modules/engagement/newsletter-delivery/delivery-api";
import {
  deliveryLocked,
  sendRequestSettled,
} from "../src/features/modules/engagement/newsletter-delivery/delivery-state";
import {
  addDestination,
  copyAddresses,
  savedDestinations,
} from "../src/features/modules/engagement/newsletter-delivery/destinations";
import {
  deliveryRecord,
  preparedVersion,
  mailbox,
  recordId,
  otherId,
  senderId,
  versionId,
  requestKey,
  sendReadback,
  intentId,
} from "./newsletter-delivery-fixtures";

const prepare = {
  recipients: [{ email: "taylor@example.test", name: "Taylor Reed" }],
  targets: [],
  senderConnectionId: senderId,
  subject: "Synthetic weekly briefing",
};
const send = {
  requestKey,
  senderConnectionId: senderId,
  versionIds: [versionId],
};
const operations = {
  ...richNewsletterOperations,
  ...newsletterDeliveryOperations,
};
function fixture() {
  let current = deliveryRecord();
  let mailboxes = [mailbox];
  let readback = sendReadback();
  let prepareReply: unknown = { versions: [preparedVersion()], excluded: [] };
  let failSend = false;
  let denyRecord = false;
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const name = new URL(String(input), "http://localhost").pathname
      .split("/")
      .at(-1)!;
    if (name.endsWith("mailboxes")) return Response.json(mailboxes);
    if (name === "engagement.richNewsletter.record")
      return denyRecord
        ? Response.json({}, { status: 403 })
        : Response.json(current);
    if (name.endsWith("prepare")) return Response.json(prepareReply);
    if (name.endsWith("sendRequest") || name.endsWith("sendStatus"))
      return Response.json(readback);
    if (name.endsWith("send") || name.endsWith("test")) {
      if (failSend) throw new TypeError("Synthetic acknowledgement lost");
      return Response.json({ intentId, deduped: false });
    }
    throw Error(`Unexpected operation ${name}`);
  });
  const api = createCapiroApi(operations, { fetcher }) as unknown as CapiroApi<
    typeof capiroOperations
  >;
  return {
    adapter: createNewsletterDeliveryApi(api),
    fetcher,
    setCurrent: (value: typeof current) => {
      current = value;
    },
    setMailboxes: (value: typeof mailboxes) => {
      mailboxes = value;
    },
    setReadback: (value: typeof readback) => {
      readback = value;
    },
    setPrepare: (value: unknown) => {
      prepareReply = value;
    },
    loseAck: () => {
      failSend = true;
    },
    revoke: () => {
      denyRecord = true;
    },
  };
}
describe("newsletter delivery receiving and explicit effects", () => {
  it("prepares only from the captured record, then reads and binds the saved versions", async () => {
    const h = fixture();
    expect(
      (await h.adapter.prepare(deliveryRecord(false), prepare, mailbox))
        .versions[0]?.id,
    ).toBe(versionId);
    expect(
      h.fetcher.mock.calls.map(([url]) =>
        new URL(String(url), "http://localhost").pathname.split("/").at(-1),
      ),
    ).toEqual([
      "engagement.newsletter.mailboxes",
      "engagement.newsletter.prepare",
      "engagement.richNewsletter.record",
    ]);
  });
  it.each([
    "foreign-version",
    "changed-stage",
    "changed-sender",
    "changed-versions",
  ])("rejects %s preparation readback", async (change) => {
    const h = fixture();
    const current = deliveryRecord();
    if (change === "foreign-version")
      h.setPrepare({
        versions: [{ ...preparedVersion(), outreachRecordId: otherId }],
        excluded: [],
      });
    if (change === "changed-stage") current.stage.id = otherId;
    if (change === "changed-sender") current.senderConnectionId = otherId;
    if (change === "changed-versions") current.versions[0]!.id = otherId;
    h.setCurrent(current);
    await expect(
      h.adapter.prepare(deliveryRecord(), prepare, mailbox),
    ).rejects.toThrow();
  });
  it.each(["mailbox", "version", "eligibility", "revision", "access"])(
    "refuses changed %s before send and before retaining a dispatch identity",
    async (change) => {
      const h = fixture();
      const current = deliveryRecord();
      if (change === "mailbox")
        h.setMailboxes([{ ...mailbox, accountEmail: "changed@example.test" }]);
      if (change === "version") current.versions[0]!.id = otherId;
      if (change === "eligibility") current.versions[0]!.sendable = false;
      if (change === "revision") current.stage.revision += 1;
      if (change === "access") h.revoke();
      h.setCurrent(current);
      const retain = vi.fn();
      await expect(
        h.adapter.send(
          deliveryRecord(),
          send,
          mailbox,
          false,
          undefined,
          retain,
        ),
      ).rejects.toThrow();
      expect(retain).not.toHaveBeenCalled();
      expect(
        h.fetcher.mock.calls.every(([, init]) => init?.method !== "POST"),
      ).toBe(true);
    },
  );
  it("retains identity immediately before one dispatch, and never replays a lost acknowledgement", async () => {
    const h = fixture();
    h.loseAck();
    const retain = vi.fn();
    await expect(
      h.adapter.send(deliveryRecord(), send, mailbox, false, undefined, retain),
    ).rejects.toThrow();
    expect(retain).toHaveBeenCalledTimes(1);
    expect(
      h.fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });
  it("aborts before dispatch without retaining a request", async () => {
    const h = fixture();
    const abort = new AbortController();
    abort.abort();
    const retain = vi.fn();
    await expect(
      h.adapter.send(
        deliveryRecord(),
        send,
        mailbox,
        false,
        abort.signal,
        retain,
      ),
    ).rejects.toThrow();
    expect(retain).not.toHaveBeenCalled();
  });
  it("binds retained requests and known status to record, key, mailbox, exact versions and test mode", async () => {
    const h = fixture();
    const binding = { recordId, ...send, testMode: false, intentId };
    expect((await h.adapter.request(binding)).intent?.id).toBe(intentId);
    expect((await h.adapter.status(recordId, intentId)).intent?.id).toBe(
      intentId,
    );
    for (const change of [
      { outreachRecordId: otherId },
      { requestKey: "foreign-request" },
      { senderConnectionId: otherId },
      { versionIds: [otherId] },
      { testMode: true },
    ]) {
      const value = sendReadback();
      Object.assign(value.intent!, change);
      h.setReadback(value);
      await expect(h.adapter.request(binding)).rejects.toThrow();
    }
  });
  it("preserves absent outcomes as read observations and does not mutate while checking", async () => {
    const h = fixture();
    h.setReadback({ outreachRecordId: recordId, requestKey, intent: null });
    const value = await h.adapter.request({ recordId, requestKey });
    expect(value.intent).toBeNull();
    expect(deliveryLocked(deliveryRecord(), value)).toBe(true);
    expect(
      h.fetcher.mock.calls.every(([, init]) => init?.method === "GET"),
    ).toBe(true);
  });
  it("locks real sends and unsettled or future test states, including aggregate-complete with an unknown unit", () => {
    for (const status of ["queued", "running", "unknown", "future"])
      expect(sendRequestSettled(sendReadback(true, status))).toBe(false);
    const test = sendReadback(true, "complete");
    test.intent!.deliveries[0]!.status = "unknown";
    expect(sendRequestSettled(test)).toBe(false);
    test.intent!.deliveries[0]!.status = "sent";
    expect(sendRequestSettled(test)).toBe(true);
    expect(deliveryLocked(deliveryRecord(), test)).toBe(false);
    test.intent!.testMode = false;
    expect(deliveryLocked(deliveryRecord(), test)).toBe(true);
    expect(deliveryLocked({ ...deliveryRecord(), intentId })).toBe(true);
    expect(deliveryLocked({ ...deliveryRecord(), status: "future" })).toBe(
      true,
    );
  });
  it("deduplicates selected emails, validates copy addresses, and never treats arbitrary targets as prepared authority", () => {
    const rows = [{ email: "taylor@example.test", name: "Taylor" }];
    expect(addDestination(rows, { email: "TAYLOR@example.test" })).toBe(rows);
    expect(copyAddresses("copy@example.test; COPY@example.test")).toEqual([
      "copy@example.test",
    ]);
    expect(() => copyAddresses("not-an-email")).toThrow();
    expect(
      savedDestinations({
        ...deliveryRecord(),
        targets: [{ group: "unsupported" }],
      }),
    ).toEqual([]);
  });
  it("request operations reject injected authority and route every effect only through the existing newsletter owner", () => {
    expect(
      operations["engagement.newsletter.send"].request.safeParse({
        params: { id: recordId },
        body: { ...send, tenantId: otherId },
      }).success,
    ).toBe(false);
    expect(
      operations["engagement.newsletter.prepare"].request.safeParse({
        params: { id: recordId },
        body: { ...prepare, recipients: [{ email: "bad" }] },
      }).success,
    ).toBe(false);
    expect(operations["engagement.newsletter.sendRequest"].method).toBe("GET");
  });
});
