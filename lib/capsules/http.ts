import {
  type Capsule,
  type CapsuleCreateInput,
  canReadCapsuleContent,
  canReadCapsuleMetadata,
  getCapsuleState,
} from "./model";
import { getAuthenticatedUserId } from "@/lib/auth/user";

export type CapsuleResponse = {
  id: string;
  ownerId: string;
  title: string;
  body?: string;
  visibility: Capsule["visibility"];
  state: ReturnType<typeof getCapsuleState>;
  canOpen: boolean;
  openAt: string;
  openedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mediaCount: number;
  mediaTotalBytes: number;
};

type CapsuleRequestBody = {
  title?: unknown;
  body?: unknown;
  openAt?: unknown;
  visibility?: unknown;
  mediaCount?: unknown;
  mediaTotalBytes?: unknown;
};

export function requesterIdFromHeaders(headers: Headers): string | null {
  return getAuthenticatedUserId({ headers });
}

export function parseCapsuleCreateBody(payload: CapsuleRequestBody, ownerId: string): CapsuleCreateInput {
  return {
    ownerId,
    title: typeof payload.title === "string" ? payload.title : "",
    body: typeof payload.body === "string" ? payload.body : "",
    openAt: typeof payload.openAt === "string" ? new Date(payload.openAt) : new Date(Number.NaN),
    visibility: typeof payload.visibility === "string" ? payload.visibility : undefined,
    mediaCount:
      payload.mediaCount === undefined
        ? undefined
        : typeof payload.mediaCount === "number"
          ? payload.mediaCount
          : Number.NaN,
    mediaTotalBytes:
      payload.mediaTotalBytes === undefined
        ? undefined
        : typeof payload.mediaTotalBytes === "number"
          ? payload.mediaTotalBytes
          : Number.NaN,
  };
}

export function toCapsuleResponse(capsule: Capsule, requesterId: string | null, now = new Date()): CapsuleResponse {
  return {
    id: capsule.id,
    ownerId: capsule.ownerId,
    title: capsule.title,
    ...(canReadCapsuleContent(capsule, { requesterId, now }) ? { body: capsule.body } : {}),
    visibility: capsule.visibility,
    state: getCapsuleState(capsule),
    canOpen: capsule.ownerId === requesterId && !capsule.openedAt && capsule.openAt <= now,
    openAt: capsule.openAt.toISOString(),
    openedAt: capsule.openedAt?.toISOString() ?? null,
    createdAt: capsule.createdAt.toISOString(),
    updatedAt: capsule.updatedAt.toISOString(),
    mediaCount: capsule.mediaCount,
    mediaTotalBytes: capsule.mediaTotalBytes,
  };
}

export function filterReadableCapsules(capsules: Capsule[], requesterId: string | null): Capsule[] {
  return capsules.filter((capsule) => canReadCapsuleMetadata(capsule, { requesterId }));
}
