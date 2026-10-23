"use client";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { logoContentTypeSchema } from "../../../shared/capiro/operations/settings-schemas";
import { uploadCapiroLogo } from "../../../shared/capiro/uploads";
import { useSettingsMutation } from "../useSettingsMutation";

/** Existing upload transport, followed by the canonical Settings confirmation journal. */
export function useBrandingLogo(reload: () => void) {
  const raw = useCapiro();
  const mutation = useSettingsMutation("branding-logo");
  function uploadFile(file: File) {
    if (mutation.locked) return;
    void mutation.action.run(
      async (signal) => {
        const contentType = logoContentTypeSchema.safeParse(file.type);
        if (!contentType.success)
          throw new Error("Choose a PNG, JPG, WEBP or SVG logo.");
        if (!file.size || file.size > 2 * 1024 * 1024)
          throw new Error("Choose a logo smaller than 2 MB.");
        // Issuing an upload ticket does not change the canonical logo. Only
        // confirmation below is a Settings write; tickets/bytes are never journaled.
        const ticket = await raw.request(
          "settings.branding.logoUploadUrl",
          { body: { contentType: contentType.data, contentLength: file.size } },
          { signal },
        );
        await uploadCapiroLogo(ticket, file, { signal });
        signal.throwIfAborted();
        return mutation.api.request(
          "settings.branding.logoConfirm",
          { body: { s3Key: ticket.s3Key, contentType: contentType.data } },
          { signal },
        );
      },
      "Logo was uploaded.",
      reload,
    );
  }
  return { ...mutation, uploadFile };
}
