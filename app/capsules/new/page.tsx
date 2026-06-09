"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCapsule } from "@/lib/capsule";

const TITLE_MAX = 80;
const BODY_MAX = 2000;

type Errors = {
  title?: string;
  body?: string;
  unlockAt?: string;
};

function validate(values: {
  title: string;
  body: string;
  unlockAt: string;
}): Errors {
  const errors: Errors = {};

  const title = values.title.trim();
  if (title.length === 0) {
    errors.title = "Title is required.";
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  }

  const body = values.body.trim();
  if (body.length === 0) {
    errors.body = "Body is required.";
  } else if (values.body.length > BODY_MAX) {
    errors.body = `Body must be ${BODY_MAX} characters or fewer.`;
  }

  if (values.unlockAt.length === 0) {
    errors.unlockAt = "Unlock date is required.";
  } else {
    const parsed = new Date(values.unlockAt);
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

  const errors = useMemo(
    () => validate({ title, body, unlockAt }),
    [title, body, unlockAt],
  );
  const isValid = Object.keys(errors).length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    const created = createCapsule({
      title: title.trim(),
      body,
      unlockAt: new Date(unlockAt).toISOString(),
    });
    router.push(`/capsules/${created.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">New capsule</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Write something to your future self. It stays locked until the unlock
        date.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900"
          />
          {errors.title ? (
            <p id="title-error" className="mt-1 text-sm text-red-600">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="body"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Body
            </label>
            <span
              aria-live="polite"
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {body.length} / {BODY_MAX}
            </span>
          </div>
          <textarea
            id="body"
            name="body"
            required
            rows={8}
            maxLength={BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? "body-error" : undefined}
            className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900"
          />
          {errors.body ? (
            <p id="body-error" className="mt-1 text-sm text-red-600">
              {errors.body}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="unlockAt"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Unlock at
          </label>
          <input
            id="unlockAt"
            name="unlockAt"
            type="datetime-local"
            required
            value={unlockAt}
            onChange={(e) => setUnlockAt(e.target.value)}
            aria-invalid={Boolean(errors.unlockAt)}
            aria-describedby={errors.unlockAt ? "unlockAt-error" : undefined}
            className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900"
          />
          {errors.unlockAt ? (
            <p id="unlockAt-error" className="mt-1 text-sm text-red-600">
              {errors.unlockAt}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Create capsule
          </button>
        </div>
      </form>
    </main>
  );
}
