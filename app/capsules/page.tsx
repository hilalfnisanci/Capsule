"use client";

import { useEffect, useState } from "react";
import { isUnlocked, listCapsules, type Capsule } from "@/lib/capsule";
import CapsuleRow from "./CapsuleRow";
import EmptyState from "./EmptyState";

export default function CapsulesPage() {
  const [items, setItems] = useState<Capsule[] | null>(null);

  useEffect(() => {
    setItems(
      [...listCapsules()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
  }, []);

  if (items === null) return null;
  if (items.length === 0) return <EmptyState />;

  return (
    <section aria-labelledby="capsules-heading">
      <h1
        id="capsules-heading"
        className="mb-6 text-2xl font-semibold tracking-tight text-gray-900"
      >
        Your capsules
      </h1>
      <ul className="flex flex-col gap-3">
        {items.map((c) => (
          <li key={c.id}>
            <CapsuleRow capsule={c} unlocked={isUnlocked(c)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
