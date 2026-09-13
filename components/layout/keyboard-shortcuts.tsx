"use client";

/**
 * Global shortcuts:
 *  - ⌘K / Ctrl+K → patient search (focus the input if already there,
 *    navigate there if not)
 *  - Alt+N → add documentation for the patient currently open (record view only)
 * ⌘N/Ctrl+N is browser-reserved (new window) and never reaches page JS,
 * which is why the authoring shortcut uses Alt+N.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (pathname === "/search") {
          document.getElementById("patient-search-input")?.focus();
        } else {
          router.push("/search");
        }
        return;
      }
      if (event.altKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "n") {
        const match = /^\/patients\/([^/]+)$/.exec(pathname);
        if (match) {
          event.preventDefault();
          router.push(`/add-documentation/${match[1]}`);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return null;
}