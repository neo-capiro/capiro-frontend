import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { GET } from "../src/app/favicon.ico/route";

describe("public favicon request", () => {
  it.each(["https://preview.example.test", "http://localhost:3000"])(
    "redirects the conventional request to the existing brand asset at %s",
    async (origin) => {
      const response = GET(new Request(`${origin}/favicon.ico?cache=old`));
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        `${origin}/onboard/favicon.svg`,
      );
      expect(await response.text()).toBe("");
      expect(response.headers.has("set-cookie")).toBe(false);
      const icon = await readFile(
        new URL("../public/onboard/favicon.svg", import.meta.url),
        "utf8",
      );
      expect(icon).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(icon).toContain('viewBox="0 0 32 32"');
    },
  );
});
