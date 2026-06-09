import Link from "next/link";
import type { Capsule } from "@/lib/capsule";
import { formatCountdown, formatUnlockDate } from "@/lib/capsule-format";

const PREVIEW_MAX = 120;

function preview(body: string): string {
  if (body.length <= PREVIEW_MAX) return body;
  return body.slice(0, PREVIEW_MAX).trimEnd() + "…";
}

type Props = {
  capsule: Capsule;
  unlocked: boolean;
};

export default function CapsuleRow({ capsule, unlocked }: Props) {
  const statusLabel = unlocked ? "Unlocked" : "Locked";
  const statusClasses = unlocked
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
  const countdown = unlocked
    ? null
    : formatCountdown(Date.parse(capsule.unlockAt) - Date.now());

  return (
    <Link
      href={`/capsules/${capsule.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-gray-900">
            {capsule.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {preview(capsule.body)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Unlocks {formatUnlockDate(capsule.unlockAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <span
            aria-label={statusLabel}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
          {countdown !== null && (
            <span
              aria-label={`opens in ${countdown}`}
              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
            >
              opens in {countdown}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
