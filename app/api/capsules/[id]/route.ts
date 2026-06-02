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
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  const capsule = await findCapsule(id);
  if (!capsule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canRead(capsule, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const showContent = canViewContent(capsule, userId);
  const detail = serialiseCapsuleDetail(capsule);

  if (!showContent) {
    // Strip content fields so locked capsules don't leak their contents.
    return NextResponse.json({ capsule: { ...detail, description: null, media: [] } });
  }

  return NextResponse.json({ capsule: detail });
}

// ---------------------------------------------------------------------------
// PATCH /api/capsules/[id]
// Update mutable fields (title, description, visibility). Owner only, while LOCKED.
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      capsule.userId !== userId ? "Forbidden" : "Cannot modify an opened capsule";
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

  const updated = await prisma.capsule.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
    },
    include: { media: true },
  });

  return NextResponse.json({ capsule: serialiseCapsule(updated) });
}

// ---------------------------------------------------------------------------
// DELETE /api/capsules/[id]
// Delete a capsule. Owner only, any status.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
