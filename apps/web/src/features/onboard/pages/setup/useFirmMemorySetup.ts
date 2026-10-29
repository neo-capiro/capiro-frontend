import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { useScopedAction } from "@/shared/session/useScopedAction";
import type { MemoryDraftFile } from "@capiro/shared/settings-memory-drafts";

export const FIRM_FILES = [
  { type: "firm-soul", display: "Firm Soul" },
  { type: "firm-compass", display: "Firm Compass" },
  { type: "playbook", display: "Firm Playbook" },
] as const;
export type FirmFileType = (typeof FIRM_FILES)[number]["type"];
function published(file: MemoryDraftFile | undefined, type: FirmFileType) {
  return (
    !!file &&
    file.type === type &&
    file.slug === "firm" &&
    file.scope === "firm" &&
    !!file.baseItemId &&
    file.sections.some(
      (section) => section.owner === "human" && section.body.trim(),
    )
  );
}

/** Setup completion observes published memory, never a draft or submission receipt. */
export function useFirmMemorySetup() {
  const api = useCapiro();
  const completion = useScopedAction(api);
  const soul = useCapiroQuery("settings.memory.drafts.file", {
    params: { type: "firm-soul", slug: "firm" },
  });
  const compass = useCapiroQuery("settings.memory.drafts.file", {
    params: { type: "firm-compass", slug: "firm" },
  });
  const playbook = useCapiroQuery("settings.memory.drafts.file", {
    params: { type: "playbook", slug: "firm" },
  });
  const reads = { "firm-soul": soul, "firm-compass": compass, playbook };
  const reload = () => {
    soul.reload();
    compass.reload();
    playbook.reload();
  };
  const files = FIRM_FILES.map((file) => ({
    ...file,
    state: reads[file.type].loading
      ? "Checking"
      : reads[file.type].error
        ? "Unavailable"
        : published(reads[file.type].data, file.type)
          ? "Published"
          : "Needs published content",
  }));
  const complete = (onComplete: () => void) =>
    completion.run(
      async (signal) => {
        const current = await Promise.all(
          FIRM_FILES.map(({ type }) =>
            api.request(
              "settings.memory.drafts.file",
              { params: { type, slug: "firm" } },
              { signal },
            ),
          ),
        );
        signal.throwIfAborted();
        if (
          !current.every((file, index) =>
            published(file, FIRM_FILES[index]!.type),
          )
        ) {
          reload();
          throw new Error(
            "All three firm files need published content. Refresh after review is complete.",
          );
        }
      },
      "Published firm files verified.",
      onComplete,
    );
  return {
    files,
    reload,
    complete,
    completion,
    allPublished: files.every((file) => file.state === "Published"),
  };
}
