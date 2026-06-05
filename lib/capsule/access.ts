import type { Capsule, CapsuleShare } from "@prisma/client";
import { CapsuleStatus, CapsuleVisibility } from "@prisma/client";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface CapsuleWithShares extends Capsule {
  sharedWith: CapsuleShare[];
}

// ------------------------------------------------------------------
// Visibility / read access
// ------------------------------------------------------------------

/**
 * Returns true if `userId` is allowed to read the given capsule.
 *
 * Rules:
 *  - Owner always has read access.
 *  - PUBLIC capsules are readable by anyone (userId may be null for
 *    unauthenticated requests).
 *  - SHARED capsules are readable by the owner and explicitly invited users.
 *  - PRIVATE capsules are readable only by the owner.
 *
 * Note: read access does NOT mean the capsule content is visible — that
 * also depends on the capsule status (see `canViewContent`).
 */
export function canRead(
  capsule: CapsuleWithShares,
  userId: string | null
): boolean {
  if (capsule.visibility === CapsuleVisibility.PUBLIC) return true;
  if (userId === null) return false;
  if (capsule.userId === userId) return true;
  if (capsule.visibility === CapsuleVisibility.SHARED) {
    return capsule.sharedWith.some((s) => s.userId === userId);
  }
  return false;
}

/**
 * Returns true if `userId` may see the capsule's content (description, media).
 *
 * Content is hidden while the capsule is LOCKED, unless the viewer is the owner
 * (owners can preview their own locked capsule).
 */
export function canViewContent(
  capsule: CapsuleWithShares,
  userId: string | null
): boolean {
  if (!canRead(capsule, userId)) return false;
  if (capsule.status === CapsuleStatus.OPENED) return true;
  // LOCKED: only the owner may see content
  return capsule.userId === userId;
}

// ------------------------------------------------------------------
// Write / mutation access
// ------------------------------------------------------------------

/**
 * Returns true if `userId` may update the capsule's editable fields
 * (title, description, visibility).
 *
 * Only the owner can write, and only while the capsule is LOCKED.
 * Once opened, a capsule becomes immutable — it is a historical record.
 */
export function canUpdate(capsule: Capsule, userId: string): boolean {
  return capsule.userId === userId && capsule.status === CapsuleStatus.LOCKED;
}

/**
 * Returns true if `userId` may delete the capsule.
 *
 * Only the owner may delete, regardless of status.
 */
export function canDelete(capsule: Capsule, userId: string): boolean {
  return capsule.userId === userId;
}

/**
 * Returns true if `userId` may invite others to a SHARED capsule.
 *
 * Only the owner can manage shares.
 */
export function canShare(capsule: Capsule, userId: string): boolean {
  return capsule.userId === userId;
}

// ------------------------------------------------------------------
// Lifecycle / open-date rules
// ------------------------------------------------------------------

/**
 * Returns true if the capsule is eligible to be opened right now.
 *
 * Conditions:
 *  - The capsule must currently be LOCKED.
 *  - The open date must be in the past (or equal to now).
 */
export function isEligibleToOpen(
  capsule: Capsule,
  now: Date = new Date()
): boolean {
  return capsule.status === CapsuleStatus.LOCKED && capsule.openDate <= now;
}

/**
 * Returns true if the proposed `openDate` is valid for a new or updated capsule.
 *
 * The open date must be strictly in the future to prevent creating capsules
 * that are immediately openable.
 */
export function isValidOpenDate(
  openDate: Date,
  now: Date = new Date()
): boolean {
  return openDate > now;
}
