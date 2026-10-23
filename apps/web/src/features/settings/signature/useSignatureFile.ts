"use client";
import { useEffect, useRef, useState } from "react";

const allowedImages = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** Read only local selected bytes; scope cleanup prevents an old file replacing a new draft. */
export function useSignatureFile(
  scope: object,
  disabled: boolean,
  onRead: (html: string) => void,
) {
  const fileReader = useRef<FileReader | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setReading(false);
    setFileError(undefined);
  }
  useEffect(
    () => () => {
      const reader = fileReader.current;
      fileReader.current = null;
      reader?.abort();
    },
    [scope],
  );
  function readFile(file?: File) {
    if (!file || disabled || fileReader.current) return;
    setFileError(undefined);
    if (file.size > 12_000_000) {
      setFileError("Choose a file smaller than 12 MB.");
      return;
    }
    const image = allowedImages.has(file.type);
    if (!image && !/\.html?$/i.test(file.name)) {
      setFileError("Choose a PNG, JPG, GIF, WEBP or HTML signature file.");
      return;
    }
    const reader = new FileReader();
    fileReader.current = reader;
    setReading(true);
    reader.onload = () => {
      if (fileReader.current !== reader) return;
      onRead(
        image
          ? `<img src="${String(reader.result)}" alt="Email signature" />`
          : String(reader.result),
      );
      fileReader.current = null;
      setReading(false);
    };
    reader.onerror = () => {
      if (fileReader.current !== reader) return;
      fileReader.current = null;
      setReading(false);
      setFileError("The selected file could not be read.");
    };
    if (image) reader.readAsDataURL(file);
    else reader.readAsText(file);
  }
  return { reading, fileError, readFile };
}
