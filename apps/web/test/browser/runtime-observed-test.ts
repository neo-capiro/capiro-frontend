import { expect, test as base } from "@playwright/test";

type RuntimeObservation = {
  pageErrors: string[];
  consoleErrors: {
    text: string;
    location: { url: string; lineNumber: number; columnNumber: number };
  }[];
};

/** Preserve HTTP-error console evidence separately from unhandled exceptions. */
export const test = base.extend<{ runtimeObservation: RuntimeObservation }>({
  runtimeObservation: [
    async ({ page }, use, info) => {
      const observed: RuntimeObservation = {
        pageErrors: [],
        consoleErrors: [],
      };
      page.on("pageerror", (error) => observed.pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error")
          observed.consoleErrors.push({
            text: message.text(),
            location: message.location(),
          });
      });
      await use(observed);
      await info.attach("runtime-observations", {
        body: JSON.stringify(observed, null, 2),
        contentType: "application/json",
      });
      expect(observed.pageErrors, "No unhandled browser exceptions").toEqual(
        [],
      );
    },
    { auto: true },
  ],
});
