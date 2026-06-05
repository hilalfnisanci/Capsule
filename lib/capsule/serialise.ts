import type { Capsule, CapsuleMedia, CapsuleShare } from "@prisma/client";
import type {
  CapsuleResponse,
  CapsuleDetailResponse,
  MediaResponse,
  ShareResponse,
} from "./types";

export function serialiseCapsule(
  capsule: Capsule & { media: CapsuleMedia[] }
): CapsuleResponse {
  return {
    id: capsule.id,
    title: capsule.title,
    description: capsule.description,
    userId: capsule.userId,
    status: capsule.status as "LOCKED" | "OPENED",
    visibility: capsule.visibility as "PRIVATE" | "SHARED" | "PUBLIC",
    openDate: capsule.openDate.toISOString(),
    openedAt: capsule.openedAt?.toISOString() ?? null,
    createdAt: capsule.createdAt.toISOString(),
    updatedAt: capsule.updatedAt.toISOString(),
    mediaCount: capsule.media.length,
  };
}

export function serialiseCapsuleDetail(
  capsule: Capsule & { media: CapsuleMedia[]; sharedWith: CapsuleShare[] }
): CapsuleDetailResponse {
  return {
    ...serialiseCapsule(capsule),
    media: capsule.media.map(serialiseMedia),
    sharedWith: capsule.sharedWith.map(serialiseShare),
  };
}

function serialiseMedia(m: CapsuleMedia): MediaResponse {
  return {
    id: m.id,
    type: m.type as "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT",
    url: m.url,
    filename: m.filename,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes.toString(),
    createdAt: m.createdAt.toISOString(),
  };
}

function serialiseShare(s: CapsuleShare): ShareResponse {
  return {
    userId: s.userId,
    invitedAt: s.invitedAt.toISOString(),
  };
}
