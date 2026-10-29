import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { chromium, expect, test } from "@playwright/test";
import type { UploadReceipt } from "../../src/shared/meri-uploads/facade";
import { tabIdentity } from "./selected-tab-native-fixture";
import { openExtensionPopup } from "./selected-tab-extension-driver";

test("native extension hands exact bytes to the real composer and reconciles a lost upload response", async ({}, testInfo) => {
  const extension = process.env.SELECTED_TAB_EXTENSION_ROOT;
  if (!extension || !isAbsolute(extension))
    throw Error(
      "SELECTED_TAB_EXTENSION_ROOT must name the owned extension source",
    );
  const manifest = JSON.parse(
    await readFile(join(extension, "manifest.json"), "utf8"),
  );
  expect(manifest.permissions).toEqual(["activeTab", "scripting"]);
  const origin = "https://portfolio-preview.app.capiro.ai";
  expect(manifest.externally_connectable.matches).toEqual([`${origin}/*`]);
  const context = await chromium.launchPersistentContext(
    testInfo.outputPath("profile"),
    {
      channel: "chromium",
      headless: true,
      viewport: { width: 1440, height: 1040 },
      args: [
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    },
  );
  const originals: Buffer[] = [],
    methods: string[] = [];
  let receipt: UploadReceipt | undefined;
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(worker.url()).hostname;
    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.addInitScript((id) => {
      Object.assign(window, {
        process: { env: { NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID: id } },
      });
    }, extensionId);
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin === "https://source.synthetic.invalid") {
        await route.fulfill({
          contentType: "text/html; charset=utf-8",
          body: '<title>Native selected source</title><h1>Visible source</h1><p>Café 日本語</p><form>PRIVATE FORM<input value="PRIVATE FIELD"></form><div hidden>PRIVATE HIDDEN</div>',
        });
        return;
      }
      if (url.origin !== origin) {
        await route.abort();
        return;
      }
      if (!url.pathname.startsWith("/api/")) {
        const response = await route.fetch({
          url: `${testInfo.project.use.baseURL}${url.pathname}${url.search}`,
        });
        await route.fulfill({ response });
        return;
      }
      methods.push(url.pathname);
      if (url.pathname === "/api/capiro/me.read") {
        await route.fulfill({ json: tabIdentity });
        return;
      }
      expect(request.headers()["x-meri-action-session"]).toBe(
        `action_session_${"F".repeat(43)}`,
      );
      if (url.pathname === "/api/uploads/initiate") {
        const q = request.postDataJSON();
        receipt = {
          uploadId: randomUUID(),
          requestId: q.requestId,
          original: {
            filename: q.filename,
            mimeType: q.mimeType,
            bytes: q.bytes,
            sha256: q.sha256,
            versionId: null,
          },
          storageStatus: "awaiting_upload",
          scanStatus: "pending",
          scanReason: null,
          extraction: { status: "pending", limitations: [] },
          originalBytesAvailable: false,
        };
        await route.fulfill({ json: receipt });
        return;
      }
      if (url.pathname.startsWith("/api/uploads/original/")) {
        const bytes = request.postDataBuffer()!;
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(
          receipt!.original.sha256,
        );
        expect(bytes.length).toBe(receipt!.original.bytes);
        originals.push(bytes);
        receipt = {
          ...receipt!,
          original: { ...receipt!.original, versionId: randomUUID() },
          storageStatus: "stored",
        };
        await route.abort("failed");
        return; // Storage committed, acknowledgement lost.
      }
      if (url.pathname === "/api/uploads/status") {
        await route.fulfill({ json: receipt });
        return;
      }
      await route.abort();
      throw Error(`Unexpected synthetic service route: ${url.pathname}`);
    });
    const app = await context.newPage();
    await app.goto(`${origin}/selected-tab.html?port=native`);
    await app.getByText("Share a browser tab", { exact: true }).click();
    await app
      .getByRole("button", { name: "Connect extension", exact: true })
      .click();
    await expect(
      app.getByText("Connection: connected", { exact: true }),
    ).toBeVisible();
    expect(await app.evaluate(() => typeof window.__tabFixture)).toBe(
      "undefined",
    );
    const source = await context.newPage();
    await source.goto(
      "https://source.synthetic.invalid/article?PRIVATE_QUERY#PRIVATE_FRAGMENT",
    );
    await source.bringToFront();
    const cdp = await context.browser()!.newBrowserCDPSession();
    const targets = await cdp.send("Target.getTargets", {
      filter: [{ type: "tab", exclude: false }],
    });
    const target = targets.targetInfos.find(
      (value) => value.type === "tab" && value.url === source.url(),
    )!;
    const popup = await openExtensionPopup(cdp, extensionId, target.targetId);
    await expect
      .poll(() =>
        popup.evaluate<boolean>(
          "!!document.getElementById('approve') && !document.getElementById('approve').hidden",
        ),
      )
      .toBe(true);
    await popup.evaluate("document.getElementById('approve').click()");
    await expect
      .poll(() =>
        popup.evaluate<boolean>("!document.getElementById('capture').hidden"),
      )
      .toBe(true);
    await popup.evaluate("document.getElementById('capture').click()");
    await expect
      .poll(() =>
        popup.evaluate<boolean>("!document.getElementById('preview').hidden"),
      )
      .toBe(true);
    expect(
      await popup.evaluate<string>(
        "document.getElementById('text').textContent",
      ),
    ).not.toContain("PRIVATE");
    await popup.evaluate("document.getElementById('share').click()");
    await expect(
      app.getByRole("button", { name: "Check the status of shared-tab.txt" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        popup.evaluate<boolean>("document.getElementById('capture').disabled"),
      )
      .toBe(true);
    expect(originals).toHaveLength(1);
    expect(originals[0]!.toString("utf8")).toBe(
      "Selected tab: Native selected source\nSource: https://source.synthetic.invalid/article\n\nVisible source\nCafé 日本語\n",
    );
    await app
      .getByRole("button", { name: "Check the status of shared-tab.txt" })
      .click();
    await expect(
      app.getByRole("status").filter({ hasText: "SCAN_PENDING" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        popup.evaluate<boolean>("document.getElementById('capture').disabled"),
      )
      .toBe(false);
    expect(originals).toHaveLength(1);
    expect(
      methods.filter((value) => value === "/api/uploads/status"),
    ).toHaveLength(1);
    await app.screenshot({
      path: testInfo.outputPath("native-extension-attached.png"),
    });
    await popup.evaluate("document.getElementById('capture').click()");
    await expect
      .poll(() =>
        popup.evaluate<boolean>("!document.getElementById('preview').hidden"),
      )
      .toBe(true);
    await app.getByRole("button", { name: "Pause sharing" }).click();
    await expect
      .poll(() =>
        popup.evaluate<string>("document.getElementById('status').textContent"),
      )
      .toContain("Connection: paused");
    expect(
      await popup.evaluate<string>(
        "document.getElementById('text').textContent",
      ),
    ).toBe("");
    await popup.evaluate("document.getElementById('approve').click()");
    await expect
      .poll(() =>
        popup.evaluate<boolean>("!document.getElementById('capture').hidden"),
      )
      .toBe(true);
    await popup.evaluate("document.getElementById('capture').click()");
    await expect
      .poll(() =>
        popup.evaluate<boolean>("!document.getElementById('preview').hidden"),
      )
      .toBe(true);
    await app.getByRole("button", { name: "End native session" }).click();
    await expect(
      app.getByText("Connection: revoked", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        popup.evaluate<string>("document.getElementById('status').textContent"),
      )
      .toMatch(/Connection: (?:revoked|disconnected)/);
    expect(
      await popup.evaluate<string>(
        "document.getElementById('text').textContent",
      ),
    ).toBe("");
    expect(
      await popup.evaluate<boolean>(
        "document.getElementById('capture').hidden",
      ),
    ).toBe(true);
    expect(originals).toHaveLength(1);
    await testInfo.attach("native-extension-evidence", {
      contentType: "application/json",
      body: JSON.stringify(
        {
          browser: context.browser()!.version(),
          nativeExtension: true,
          realExternalPort: true,
          realComposerUploadClient: true,
          exactOriginalBytes: originals[0]!.length,
          exactOriginalSha256: createHash("sha256")
            .update(originals[0]!)
            .digest("hex"),
          writes: originals.length,
          statusReads: methods.filter(
            (value) => value === "/api/uploads/status",
          ).length,
          pendingCaptureErasedOnPause: true,
          pendingCaptureErasedOnSessionLoss: true,
          services:
            "Synthetic identity and upload responses; no live authorization or durable storage claim",
        },
        null,
        2,
      ),
    });
  } finally {
    await context.close();
  }
});
