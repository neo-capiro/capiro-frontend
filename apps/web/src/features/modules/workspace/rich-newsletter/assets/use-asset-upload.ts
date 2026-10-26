"use client";
import { useEffect, useRef, useState } from "react";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { validateUploadFiles } from "../../../../../shared/capiro/multipart";
import { assetUploadPolicy } from "../../../../../shared/capiro/operations/rich-newsletter-assets";

export function assetFileError(file: File | undefined) {
  try {
    validateUploadFiles(
      file ? [{ field: "file", file }] : [],
      assetUploadPolicy,
    );
    return undefined;
  } catch {
    return "Not uploaded. Choose one PNG, JPEG, GIF or WebP image, from 1 byte to 10 MiB.";
  }
}
/** Transient acknowledged/unknown state, never a durable request receipt. */
export function useAssetUpload() {
  const mutation = useCapiroMutation("workspace.richNewsletter.assets.upload");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState<string>();
  const [unknown, setUnknown] = useState(false);
  const active = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const choose = (file: File | undefined) => {
    if (active.current || unknown) return;
    setFile(file);
    setError(file ? assetFileError(file) : undefined);
    mutation.reset();
  };
  const upload = async () => {
    if (active.current || unknown) return;
    const invalid = assetFileError(file);
    if (invalid || !file) {
      setError(invalid);
      return;
    }
    active.current = true;
    setError(undefined);
    try {
      await mutation.run({ body: {} }, [{ field: "file", file }]);
    } catch {
      if (mounted.current) setUnknown(true);
    } finally {
      active.current = false;
    }
  };
  return {
    file,
    error,
    unknown,
    pending: mutation.pending,
    item: unknown ? undefined : mutation.data,
    choose,
    upload,
  };
}
export type AssetUploadState = ReturnType<typeof useAssetUpload>;
