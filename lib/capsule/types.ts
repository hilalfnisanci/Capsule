import type { Capsule, CapsuleMedia, CapsuleShare } from "@prisma/client";

export type { CapsuleStatus, CapsuleVisibility, MediaType } from "@prisma/client";

// ------------------------------------------------------------------
// Composite types with relations attached
// ------------------------------------------------------------------

export type CapsuleWithRelations = Capsule & {
  media: CapsuleMedia[];
  sharedWith: CapsuleShare[];
};

// ------------------------------------------------------------------
// API request bodies
// ------------------------------------------------------------------

export interface CreateCapsuleInput {
  title: string;
  description?: string;
  visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  openDate: string; // ISO 8601 — must be a future date
}

export interface UpdateCapsuleInput {
  title?: string;
  description?: string;
  visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
}

// ------------------------------------------------------------------
// API response shapes
// ------------------------------------------------------------------

/** Serialisable capsule shape returned to API consumers.
 * Content fields (description, media) are only populated once the
 * capsule is OPENED or when the caller is the owner. */
export interface CapsuleResponse {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  status: "LOCKED" | "OPENED";
  visibility: "PRIVATE" | "SHARED" | "PUBLIC";
  openDate: string;
  openedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mediaCount: number;
}

export interface CapsuleDetailResponse extends CapsuleResponse {
  media: MediaResponse[];
  sharedWith: ShareResponse[];
}

export interface MediaResponse {
  id: string;
  type: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT";
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ShareResponse {
  userId: string;
  invitedAt: string;
}
