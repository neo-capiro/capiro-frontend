"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function usePaletteDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [client, setClient] = useState<{ id: string; name: string } | null>(
    null,
  );
  const opener = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname.includes("/fixture")) return;
    const show = () => {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setSearch("");
      setClient(null);
      setOpen(true);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        !event.isComposing &&
        !event.repeat &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("meri:open-command-palette", show);
    return () => {
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("meri:open-command-palette", show);
    };
  }, [pathname]);
  return {
    open,
    setOpen,
    search,
    setSearch,
    client,
    setClient,
    navigate(href: string) {
      setOpen(false);
      router.push(href);
    },
    restoreFocus(event: Event) {
      if (opener.current?.isConnected) {
        event.preventDefault();
        opener.current.focus();
      }
    },
  };
}
