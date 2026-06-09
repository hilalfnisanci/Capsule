"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCapsule } from "@/lib/capsule";

const TITLE_MAX = 80;
const BODY_MAX = 2000;

type FieldErrors = {
  title?: string;
  body?: string;
  unlockAt?: string;
};

function validate(title: string, body: string, unlockAt: string): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    errors.title = "Title is required.";
  } else if (trimmedTitle.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    errors.body = "Body is required.";
  } else if (trimmedBody.length > BODY_MAX) {
    errors.body = `Body must be ${BODY_MAX} characters or fewer.`;
  }

  if (!unlockAt) {
    errors.unlockAt = "Unlock date is required.";
  } else {
    const parsed = new Date(unlockAt);
    if (Number.isNaN(parsed.getTime())) {
      errors.unlockAt = "Unlock date is invalid.";
    } else if (parsed.getTime() <= Date.now()) {
      errors.unlockAt = "Unlock date must be in the future.";
    }
  }

  return errors;
}

export default function NewCapsulePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(
    () => validate(title, body, unlockAt),
    [title, body, unlockAt],
  );
  const isValid = Object.keys(errors).length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createCapsule({
        title: title.trim(),
        body: body.trim(),
        unlockAt: new Date(unlockAt).toISOString(),
      });
      router.push(`/capsules/${created.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create capsule.",
      );
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="new-capsule-heading" className="mx-auto max-w-2xl">
      <h1
        id="new-capsule-heading"
        className="text-2xl font-semibold tracking-tight text-gray-900"
      >
        New capsule
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Write a note that unlocks at a future moment.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
          {errors.title && (
            <p id="title-error" className="mt-1 text-sm text-red-600">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium">
            Body
          </label>
          <textarea
            id="body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            required
            rows={8}
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? "body-error" : "body-count"}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
          <div className="mt-1 flex items-start justify-between gap-4">
            {errors.body ? (
              <p id="body-error" className="text-sm text-red-600">
                {errors.body}
              </p>
            ) : (
              <span />
            )}
            <p id="body-count" className="text-xs tabular-nums text-gray-500">
              {body.length}/{BODY_MAX}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="unlockAt" className="block text-sm font-medium">
            Unlock at
          </label>
          <input
            id="unlockAt"
            name="unlockAt"
            type="datetime-local"
            value={unlockAt}
            onChange={(e) => setUnlockAt(e.target.value)}
            required
            aria-invalid={Boolean(errors.unlockAt)}
            aria-describedby={errors.unlockAt ? "unlockAt-error" : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
          {errors.unlockAt && (
            <p id="unlockAt-error" className="mt-1 text-sm text-red-600">
              {errors.unlockAt}
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Creating…" : "Create capsule"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
