"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export default function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.isComposing || event.repeat) return;
      if (isEditableTarget(event.target)) return;
      router.push("/capsules/new");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
