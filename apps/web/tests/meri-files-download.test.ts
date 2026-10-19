import { describe, expect, it } from "vitest";
import { DocumentDownloadUrl } from "../src/features/meri/files/download-url";

describe("verified document download URL ownership", () => {
  it("creates no resource until explicit verified bytes are supplied", () => {
    let creates = 0;
    const owner = new DocumentDownloadUrl(() => {
      creates++;
      return "blob:verified";
    });
    expect(owner.current).toBeNull();
    expect(creates).toBe(0);
  });

  it("retires the previous resource before releasing a replacement", () => {
    const events: string[] = [];
    const owner = new DocumentDownloadUrl(
      (blob) => {
        const value = `blob:${blob.size}`;
        events.push(`create ${value}`);
        return value;
      },
      (url) => events.push(`revoke ${url}`),
    );
    expect(owner.replace(new Blob(["old"]))).toBe("blob:3");
    expect(owner.replace(new Blob(["replacement"]))).toBe("blob:11");
    expect(owner.current).toBe("blob:11");
    expect(events).toEqual([
      "create blob:3",
      "revoke blob:3",
      "create blob:11",
    ]);
  });

  it("selection or disposal cleanup is idempotent", () => {
    const revoked: string[] = [];
    const owner = new DocumentDownloadUrl(
      () => "blob:verified",
      (url) => revoked.push(url),
    );
    owner.replace(new Blob(["verified"]));
    owner.clear();
    owner.clear();
    expect(owner.current).toBeNull();
    expect(revoked).toEqual(["blob:verified"]);
  });

  it("cannot retain the old download when replacement creation fails", () => {
    const revoked: string[] = [];
    let fail = false;
    const owner = new DocumentDownloadUrl(
      () => {
        if (fail) throw new Error("Local allocation failed");
        return "blob:old";
      },
      (url) => revoked.push(url),
    );
    owner.replace(new Blob(["old"]));
    fail = true;
    expect(() => owner.replace(new Blob(["new"]))).toThrow();
    expect(owner.current).toBeNull();
    expect(revoked).toEqual(["blob:old"]);
  });
});
