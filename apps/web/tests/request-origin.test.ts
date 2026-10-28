import { describe, expect, it } from "vitest";
import {
  publicRequestOrigin,
  readRequestOrigin,
  sameRequestOrigin,
} from "../src/shared/request-origin";

// Behind the preview ALB the standalone Next server builds request.url from its bind address
// (HOSTNAME=0.0.0.0, PORT=5188) and X-Forwarded-Proto, never from the public host.
const publicOrigin = "https://app.capiro.ai";
const bindUrl = "https://0.0.0.0:5188/api/action-followthrough/session";
const request = (origin: string | null, url = bindUrl) =>
  new Request(url, {
    method: "POST",
    body: "{}",
    headers: {
      host: "app.capiro.ai",
      "x-forwarded-host": "app.capiro.ai",
      "x-forwarded-proto": "https",
      "content-type": "application/json",
      ...(origin === null ? {} : { origin }),
    },
  });

describe("publicRequestOrigin", () => {
  it("uses the configured origin behind the standalone bind address", () => {
    const configured = readRequestOrigin(publicOrigin, []);
    expect(configured).toBe(publicOrigin);
    expect(publicRequestOrigin(request(publicOrigin), configured)).toBe(
      publicOrigin,
    );
    expect(sameRequestOrigin(request(publicOrigin), configured)).toBe(true);
  });

  it("falls back to the request URL origin when nothing is configured", () => {
    const local = "http://127.0.0.1:3000";
    const plain = request(local, `${local}/api/conversations/submit`);
    expect(publicRequestOrigin(plain)).toBe(local);
    expect(publicRequestOrigin(plain, undefined)).toBe(local);
    expect(sameRequestOrigin(plain)).toBe(true);
    // The bind-address URL alone can never match a public browser Origin.
    expect(publicRequestOrigin(request(publicOrigin))).toBe(
      "https://0.0.0.0:5188",
    );
    expect(sameRequestOrigin(request(publicOrigin))).toBe(false);
  });

  it.each(["https://foreign.example", "null", `${publicOrigin}/`, null])(
    "rejects a foreign, null or missing Origin %s",
    (origin) => {
      expect(sameRequestOrigin(request(origin), publicOrigin)).toBe(false);
      expect(sameRequestOrigin(request(origin))).toBe(false);
    },
  );

  it("rejects a bind-address Origin once the public origin is configured", () => {
    const bind = request("https://0.0.0.0:5188");
    expect(sameRequestOrigin(bind, publicOrigin)).toBe(false);
    // Without configuration the request URL is the only origin there is (dev, tests).
    expect(sameRequestOrigin(bind)).toBe(true);
  });

  it("never derives the origin from Host or forwarded headers", () => {
    const hostile = new Request(bindUrl, {
      method: "POST",
      headers: {
        host: "hostile.example",
        "x-forwarded-host": "hostile.example",
        "x-forwarded-proto": "https",
        origin: "https://hostile.example",
      },
    });
    expect(publicRequestOrigin(hostile, publicOrigin)).toBe(publicOrigin);
    expect(sameRequestOrigin(hostile, publicOrigin)).toBe(false);
    expect(publicRequestOrigin(hostile)).toBe("https://0.0.0.0:5188");
  });

  it("fails closed on an invalid configured origin", () => {
    const issues: string[] = [];
    const configured = readRequestOrigin("https://0.0.0.0:5188", issues);
    expect(configured).toBeNull();
    expect(issues).toHaveLength(1);
    expect(publicRequestOrigin(request(publicOrigin), configured)).toBeNull();
    expect(sameRequestOrigin(request(publicOrigin), configured)).toBe(false);
    expect(sameRequestOrigin(request("https://0.0.0.0:5188"), null)).toBe(
      false,
    );
  });
});
