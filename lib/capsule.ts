export type Capsule = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unlockAt: string;
  openedAt: string | null;
};

export type CreateCapsuleInput = {
  title: string;
  body: string;
  unlockAt: string;
};

export const STORAGE_KEY = "orchestra.capsules";

function readAll(): Capsule[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Capsule[]) : [];
  } catch {
    return [];
  }
}

function writeAll(capsules: Capsule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
}

export function listCapsules(): Capsule[] {
  return readAll();
}

export function getCapsule(id: string): Capsule | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function createCapsule(input: CreateCapsuleInput): Capsule {
  const capsule: Capsule = {
    id: crypto.randomUUID(),
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    unlockAt: input.unlockAt,
    openedAt: null,
  };
  const all = readAll();
  all.push(capsule);
  writeAll(all);
  return capsule;
}

export function markOpened(id: string): Capsule | null {
  const all = readAll();
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const existing = all[index];
  if (existing.openedAt !== null) return existing;
  const updated: Capsule = {
    ...existing,
    openedAt: new Date().toISOString(),
  };
  all[index] = updated;
  writeAll(all);
  return updated;
}

export function deleteCapsule(id: string): void {
  const all = readAll();
  const filtered = all.filter((c) => c.id !== id);
  writeAll(filtered);
}

export function isUnlocked(capsule: Capsule, now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(capsule.unlockAt);
}
