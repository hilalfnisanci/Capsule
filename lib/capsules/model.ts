export const CAPSULE_VISIBILITIES = ["private", "public"] as const;

export type CapsuleVisibility = (typeof CAPSULE_VISIBILITIES)[number];

export type CapsuleState = "locked" | "opened";

export type Capsule = {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  visibility: CapsuleVisibility;
  openAt: Date;
  openedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  mediaCount: number;
  mediaTotalBytes: number;
};

export type CapsuleCreateInput = {
  ownerId: string;
  title: string;
  body: string;
  openAt: Date;
  visibility?: CapsuleVisibility;
  mediaCount?: number;
  mediaTotalBytes?: number;
};

export type CapsuleAccessContext = {
  requesterId: string | null;
  now?: Date;
};

export const CAPSULE_LIMITS = {
  titleMaxLength: 120,
  bodyMaxLength: 10000,
  mediaMaxItems: 12,
  mediaMaxTotalBytes: 100 * 1024 * 1024,
} as const;

export class CapsuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapsuleValidationError";
  }
}

export class CapsuleAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapsuleAccessError";
  }
}

export function getCapsuleState(capsule: Pick<Capsule, "openedAt">): CapsuleState {
  return capsule.openedAt ? "opened" : "locked";
}

export function isCapsuleOwner(
  capsule: Pick<Capsule, "ownerId">,
  requesterId: string | null,
): boolean {
  return Boolean(requesterId && capsule.ownerId === requesterId);
}

export function canOpenCapsule(
  capsule: Pick<Capsule, "ownerId" | "openAt" | "openedAt">,
  { requesterId, now = new Date() }: CapsuleAccessContext,
): boolean {
  return isCapsuleOwner(capsule, requesterId) && !capsule.openedAt && capsule.openAt <= now;
}

export function canReadCapsuleMetadata(
  capsule: Pick<Capsule, "ownerId" | "visibility" | "openedAt">,
  { requesterId }: CapsuleAccessContext,
): boolean {
  return isCapsuleOwner(capsule, requesterId) || (capsule.visibility === "public" && Boolean(capsule.openedAt));
}

export function canReadCapsuleContent(
  capsule: Pick<Capsule, "ownerId" | "visibility" | "openedAt">,
  { requesterId }: CapsuleAccessContext,
): boolean {
  if (!capsule.openedAt) {
    return false;
  }

  if (capsule.visibility === "public") {
    return true;
  }

  return isCapsuleOwner(capsule, requesterId);
}

export function assertValidCapsuleCreateInput(input: CapsuleCreateInput, now = new Date()): void {
  if (!input.ownerId.trim()) {
    throw new CapsuleValidationError("ownerId is required");
  }

  if (!input.title.trim()) {
    throw new CapsuleValidationError("title is required");
  }

  if (input.title.length > CAPSULE_LIMITS.titleMaxLength) {
    throw new CapsuleValidationError(`title must be ${CAPSULE_LIMITS.titleMaxLength} characters or fewer`);
  }

  if (!input.body.trim()) {
    throw new CapsuleValidationError("body is required");
  }

  if (input.body.length > CAPSULE_LIMITS.bodyMaxLength) {
    throw new CapsuleValidationError(`body must be ${CAPSULE_LIMITS.bodyMaxLength} characters or fewer`);
  }

  if (Number.isNaN(input.openAt.getTime())) {
    throw new CapsuleValidationError("openAt must be a valid date");
  }

  if (input.openAt <= now) {
    throw new CapsuleValidationError("openAt must be in the future");
  }

  if (input.visibility && !CAPSULE_VISIBILITIES.includes(input.visibility)) {
    throw new CapsuleValidationError("visibility must be private or public");
  }

  const mediaCount = input.mediaCount ?? 0;
  const mediaTotalBytes = input.mediaTotalBytes ?? 0;

  if (!Number.isInteger(mediaCount) || mediaCount < 0 || mediaCount > CAPSULE_LIMITS.mediaMaxItems) {
    throw new CapsuleValidationError(`mediaCount must be between 0 and ${CAPSULE_LIMITS.mediaMaxItems}`);
  }

  if (
    !Number.isInteger(mediaTotalBytes) ||
    mediaTotalBytes < 0 ||
    mediaTotalBytes > CAPSULE_LIMITS.mediaMaxTotalBytes
  ) {
    throw new CapsuleValidationError(
      `mediaTotalBytes must be between 0 and ${CAPSULE_LIMITS.mediaMaxTotalBytes}`,
    );
  }
}

export function createCapsuleRecord(
  id: string,
  input: CapsuleCreateInput,
  now = new Date(),
): Capsule {
  assertValidCapsuleCreateInput(input, now);

  return {
    id,
    ownerId: input.ownerId,
    title: input.title.trim(),
    body: input.body.trim(),
    visibility: input.visibility ?? "private",
    openAt: input.openAt,
    openedAt: null,
    createdAt: now,
    updatedAt: now,
    mediaCount: input.mediaCount ?? 0,
    mediaTotalBytes: input.mediaTotalBytes ?? 0,
  };
}

export function openCapsule(
  capsule: Capsule,
  { requesterId, now = new Date() }: CapsuleAccessContext,
): Capsule {
  if (!canOpenCapsule(capsule, { requesterId, now })) {
    throw new CapsuleAccessError("capsule can only be opened by its owner on or after openAt");
  }

  return {
    ...capsule,
    openedAt: now,
    updatedAt: now,
  };
}
