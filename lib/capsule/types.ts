import type { Capsule, CapsuleMedia, CapsuleShare } from "@prisma/client";

export type { CapsuleStatus, CapsuleVisibility, MediaType } from "@prisma/client";

// ------------------------------------------------------------------
// Re-exports with relations attached
// ------------------------------------------------------------------

export type CapsuleWithRelations = Capsule & {
  media: CapsuleMedia[];
  sharedWith: CapsuleShare[];
};

// ------------------------------------------------------------------
// Request/response shapes used by API routes
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

// Serialisable capsule shape returned to API consumers.
// `content` fields are only populated once the capsule is OPENED or for the owner.
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
