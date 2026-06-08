import { randomUUID } from "node:crypto";
import {
  type Capsule,
  type CapsuleCreateInput,
  createCapsuleRecord,
  openCapsule,
} from "./model";

type StoredCapsules = Map<string, Capsule>;

const capsules: StoredCapsules = new Map();

export function createCapsule(input: CapsuleCreateInput, now = new Date()): Capsule {
  const capsule = createCapsuleRecord(randomUUID(), input, now);
  capsules.set(capsule.id, capsule);
  return capsule;
}

export function getCapsuleById(id: string): Capsule | null {
  return capsules.get(id) ?? null;
}

export function listCapsules(): Capsule[] {
  return Array.from(capsules.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function markCapsuleOpened(id: string, requesterId: string, now = new Date()): Capsule | null {
  const capsule = getCapsuleById(id);

  if (!capsule) {
    return null;
  }

  const opened = openCapsule(capsule, { requesterId, now });
  capsules.set(opened.id, opened);
  return opened;
}

export function clearCapsulesForTests(): void {
  capsules.clear();
}
