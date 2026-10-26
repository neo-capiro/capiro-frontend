"use client";
import { useId, useRef, useState } from "react";
import {
  Field,
  TextInput,
  ActionButton,
} from "../../../../../shared/module-ui";
import { validateUploadFiles } from "../../../../../shared/capiro/multipart";
import { imageToolPolicy } from "../../../../../shared/capiro/operations/rich-newsletter-providers";

/** A resource selector only. Core resolves it and enforces current source/document access. */
export function sourceTokenFromImageUrl(value: string) {
  return value.match(
    /\/workspace-api\/newsletters\/assets\/file\/([a-f0-9]{64})$/,
  )?.[1];
}
export function useImageSource(imageUrl: string) {
  const [file, setFile] = useState<File>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const sourceToken = file ? undefined : sourceTokenFromImageUrl(imageUrl);
  return {
    file,
    sourceToken,
    error,
    version,
    ready: !!file || !!sourceToken,
    choose: (next?: File) => {
      setVersion((value) => value + 1);
      setError(undefined);
      try {
        if (next)
          validateUploadFiles([{ field: "file", file: next }], imageToolPolicy);
        setFile(next);
      } catch {
        setFile(undefined);
        setError("Choose one PNG, JPEG or WebP file of up to 10 MiB.");
      }
    },
    files: file ? [{ field: "file", file }] : [],
  };
}
export function ImageSourceField({
  source,
  disabled,
}: {
  source: ReturnType<typeof useImageSource>;
  disabled: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <p>
        {source.file
          ? `Selected file: ${source.file.name}`
          : source.sourceToken
            ? "Use the current library image. Its access is checked by the service."
            : "Choose the image file to send to the provider."}
      </p>
      <Field
        label="Image file"
        htmlFor={id}
        description="PNG, JPEG or WebP, up to 10 MiB. Selecting a file does not send it."
        error={source.error}
      >
        <TextInput
          ref={input}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          onChange={(event) => source.choose(event.target.files?.[0])}
        />
      </Field>
      {source.file && (
        <ActionButton
          disabled={disabled}
          onClick={() => {
            if (input.current) input.current.value = "";
            source.choose();
          }}
        >
          Clear selected file
        </ActionButton>
      )}
    </>
  );
}
