"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteCapsule,
  getCapsule,
  isUnlocked,
  markOpened,
  type Capsule,
} from "@/lib/capsule";
import { formatCountdown, formatUnlockDate } from "@/lib/capsule-format";

type PageProps = { params: Promise<{ id: string }> };

type LoadState = "loading" | "loaded";

export default function CapsuleDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [now, setNow] = useState<number>(() => Date.now());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setCapsule(getCapsule(id));
    setLoadState("loaded");
  }, [id]);

  useEffect(() => {
    if (capsule === null) return;
    if (isUnlocked(capsule)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [capsule]);

  if (loadState === "loading") return null;

  if (capsule === null) {
    return (
      <section
        aria-labelledby="not-found-heading"
        className="rounded-lg border border-gray-200 bg-white p-8 text-center"
      >
        <h1
          id="not-found-heading"
          className="mb-2 text-2xl font-semibold tracking-tight text-gray-900"
        >
          Capsule not found
        </h1>
        <p className="mb-6 text-gray-600">
          We couldn’t find a capsule with that id.
        </p>
        <Link
          href="/capsules"
          className="font-medium text-gray-900 underline underline-offset-4 hover:text-black"
        >
          Back to all capsules
        </Link>
      </section>
    );
  }

  const unlocked = isUnlocked(capsule, new Date(now));

  function handleDelete() {
    deleteCapsule(id);
    router.push("/capsules");
  }

  function handleOpen() {
    const updated = markOpened(id);
    if (updated !== null) setCapsule(updated);
  }

  return (
    <section aria-labelledby="capsule-heading">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1
          id="capsule-heading"
          className="text-2xl font-semibold tracking-tight text-gray-900"
        >
          {capsule.title}
        </h1>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      {!unlocked ? (
        <div
          aria-labelledby="locked-heading"
          className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center"
        >
          <p
            id="locked-heading"
            className="text-xs font-semibold uppercase tracking-widest text-amber-700"
          >
            Locked
          </p>
          <p
            aria-label="time until unlock"
            className="my-4 font-mono text-5xl font-semibold tabular-nums text-amber-900"
          >
            {formatCountdown(Date.parse(capsule.unlockAt) - now)}
          </p>
          <p className="text-sm text-amber-700">
            This capsule will reveal itself when the timer hits zero.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <article className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-6 text-gray-900">
            {capsule.body}
          </article>
          <dl className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-700">Sealed on</dt>
              <dd>{formatUnlockDate(capsule.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Unlocked on</dt>
              <dd>{formatUnlockDate(capsule.unlockAt)}</dd>
            </div>
          </dl>
          {capsule.openedAt === null ? (
            <button
              type="button"
              onClick={handleOpen}
              className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Open capsule
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              Opened {formatUnlockDate(capsule.openedAt)}
            </p>
          )}
        </div>
      )}

      {confirmingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-heading"
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2
              id="confirm-delete-heading"
              className="text-lg font-semibold text-gray-900"
            >
              Delete this capsule?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently remove the capsule. This can’t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
