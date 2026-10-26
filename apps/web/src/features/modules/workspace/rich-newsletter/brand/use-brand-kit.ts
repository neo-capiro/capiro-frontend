"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  parseNewsletterBrandKit,
  type NewsletterBrandKit,
} from "@capiro/shared/newsletter";
import { useCapiroMutation, useCapiroQuery } from "@/shared/capiro/queries";
import { validateUploadFiles } from "@/shared/capiro/multipart";
import { newsletterFontUploadPolicy } from "@/shared/capiro/operations/rich-newsletter-brand";
import { editBrand } from "./brand-draft";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import type { RichDocumentController } from "../document-controller";

/** Current editor/API scope; shared query/mutation hooks own network replacement. */
export function useBrandKit(owner: RichDocumentController) {
  const api = useCapiro();
  const scope = useMemo(() => ({ api, owner }), [api, owner]);
  const [previousScope, setPreviousScope] = useState(scope);
  const [open, setOpen] = useState(false);
  const query = useCapiroQuery(
    "workspace.richNewsletter.brand.read",
    {},
    { enabled: open },
  );
  const save = useCapiroMutation("workspace.richNewsletter.brand.save");
  const upload = useCapiroMutation("workspace.richNewsletter.brand.font");
  const [loaded, setLoaded] = useState<NewsletterBrandKit>();
  const [draft, setDraft] = useState<NewsletterBrandKit>();
  const [unknown, setUnknown] = useState<"kit" | "font">();
  const [notice, setNotice] = useState<string>();
  const [confirmed, setConfirmed] = useState<NewsletterBrandKit>();
  const active = useRef(false);
  const mounted = useRef<typeof scope | undefined>(undefined);
  const [pending, setPending] = useState(false);
  useLayoutEffect(() => {
    mounted.current = scope;
    active.current = false;
    return () => {
      mounted.current = undefined;
    };
  }, [scope]);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setOpen(false);
    setLoaded(undefined);
    setDraft(undefined);
    setUnknown(undefined);
    setNotice(undefined);
    setConfirmed(undefined);
    setPending(false);
  }
  if (query.data !== loaded) {
    setLoaded(query.data);
    setConfirmed(undefined);
    if (query.data && !unknown) setDraft(structuredClone(query.data));
  }
  return {
    open,
    draft: query.data ? draft : undefined,
    current: query.data ? (confirmed ?? query.data) : undefined,
    loading: query.loading,
    error: query.error,
    unknown,
    notice,
    pending,
    enter() {
      if (!active.current) {
        setOpen(true);
        setNotice(undefined);
      }
    },
    close() {
      if (!active.current) {
        setOpen(false);
        if (!unknown) setDraft(undefined);
      }
    },
    reload() {
      if (!active.current) {
        setNotice(undefined);
        query.reload();
      }
    },
    edit(change: (next: NewsletterBrandKit) => void) {
      if (!active.current && !unknown && query.data && draft)
        setDraft(editBrand(draft, change));
    },
    async save() {
      if (!draft || !query.data || unknown || active.current) return;
      const valid = parseNewsletterBrandKit(draft);
      if (!valid.ok) {
        setNotice("Check the Brand Kit fields before saving.");
        return;
      }
      active.current = true;
      setPending(true);
      setNotice(undefined);
      try {
        const result = await save.run({ body: draft });
        const received = parseNewsletterBrandKit(result, {
          revision: draft.revision + 1,
        });
        if (!received.ok) throw new Error("Unconfirmed brand response");
        if (mounted.current === scope) {
          setDraft(received.value);
          setConfirmed(received.value);
          setNotice(
            `Brand Kit saved at revision ${received.value.revision}. Your newsletter draft is unchanged.`,
          );
        }
      } catch {
        if (mounted.current === scope) setUnknown("kit");
      } finally {
        if (mounted.current === scope) {
          active.current = false;
          setPending(false);
        }
      }
    },
    async upload(file: File | undefined) {
      if (!draft || !query.data || unknown || active.current) return;
      try {
        validateUploadFiles(
          file ? [{ field: "file", file }] : [],
          newsletterFontUploadPolicy,
        );
      } catch {
        setNotice(
          "Choose one TTF, OTF, WOFF or WOFF2 font, up to 2 MiB. The server checks its actual format.",
        );
        return;
      }
      if (!file || draft.fonts.uploaded.length >= 20) {
        setNotice("The Brand Kit can contain up to 20 uploaded fonts.");
        return;
      }
      active.current = true;
      setPending(true);
      setNotice(undefined);
      try {
        const font = await upload.run({ body: {} }, [{ field: "file", file }]);
        if (mounted.current === scope) {
          setDraft(
            editBrand(draft, (next) => {
              next.fonts.uploaded.push(font);
            }),
          );
          setNotice(
            "Font asset uploaded. Save Brand Kit to attach it; the newsletter draft is unchanged.",
          );
        }
      } catch {
        if (mounted.current === scope) setUnknown("font");
      } finally {
        if (mounted.current === scope) {
          active.current = false;
          setPending(false);
        }
      }
    },
  };
}
export type BrandKitState = ReturnType<typeof useBrandKit>;
