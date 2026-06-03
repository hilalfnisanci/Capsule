import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canRead, canViewContent, canUpdate, canDelete } from "@/lib/capsule/access";
import { serialiseCapsuleDetail, serialiseCapsule } from "@/lib/capsule/serialise";
import type { UpdateCapsuleInput } from "@/lib/capsule/types";

type RouteParams = { params: Promise<{ id: string }> };

async function findCapsule(id: string) {
  return prisma.capsule.findUnique({
    where: { id },
    include: { media: true, sharedWith: true },
  });
}

// ---------------------------------------------------------------------------
// GET /api/capsules/[id]
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, { params }: RouteParams) {
  // TODO: replace with real auth — x-user-id is forgeable (IDOR risk)
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  const capsule = await findCapsule(id);
  if (!capsule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canRead(capsule, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Return full detail; content fields (description, media) are only populated
  // when the viewer is allowed to see the capsule contents.
  const showContent = canViewContent(capsule, userId);
  const detail = serialiseCapsuleDetail(capsule);

  if (!showContent) {
    // Strip content fields so locked capsules don't leak their contents.
    return NextResponse.json({
      capsule: { ...detail, description: null, media: [] },
    });
  }

  return NextResponse.json({ capsule: detail });
}

// ---------------------------------------------------------------------------
// PATCH /api/capsules/[id]
// Update mutable fields (title, description, visibility). Owner only, while LOCKED.
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // TODO: replace with real auth — x-user-id is forgeable (IDOR risk)
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const capsule = await findCapsule(id);
  if (!capsule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canUpdate(capsule, userId)) {
    const reason =
      capsule.userId !== userId
        ? "Forbidden"
        : "Cannot modify an opened capsule";
    return NextResponse.json({ error: reason }, { status: 403 });
  }

  let body: UpdateCapsuleInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, visibility } = body;

  if (visibility !== undefined && !["PRIVATE", "SHARED", "PUBLIC"].includes(visibility)) {
    return NextResponse.json({ error: "invalid visibility value" }, { status: 422 });
  }

  if (title !== undefined) {
    if (typeof title !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 422 });
    }
    if (title.trim() === "") {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 422 });
    }
    if (title.trim().length > 255) {
      return NextResponse.json({ error: "title must be 255 characters or fewer" }, { status: 422 });
    }
  }

  if (description !== undefined && description.trim().length > 10000) {
    return NextResponse.json(
      { error: "description must be 10 000 characters or fewer" },
      { status: 422 }
    );
  }

  // Use updateMany with a status guard to prevent TOCTOU: if a concurrent open
  // request fires between the canUpdate check and this write, count === 0 and
  // we return 409 instead of silently mutating an already-OPENED capsule.
  const result = await prisma.capsule.updateMany({
    where: { id, status: "LOCKED" },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() || null } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Cannot modify an opened capsule" }, { status: 409 });
  }

  const updated = await prisma.capsule.findUnique({
    where: { id },
    include: { media: true },
  });

  if (!updated) {
    return NextResponse.json({ error: "Capsule not found after update" }, { status: 500 });
  }

  return NextResponse.json({ capsule: serialiseCapsule(updated) });
}

// ---------------------------------------------------------------------------
// DELETE /api/capsules/[id]
// Delete a capsule. Owner only, any status.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // TODO: replace with real auth — x-user-id is forgeable (IDOR risk)
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const capsule = await findCapsule(id);
  if (!capsule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canDelete(capsule, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.capsule.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
