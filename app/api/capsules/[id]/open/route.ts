import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canViewContent, isEligibleToOpen } from "@/lib/capsule/access";
import { serialiseCapsuleDetail } from "@/lib/capsule/serialise";

type RouteParams = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/capsules/[id]/open
// Transitions a LOCKED capsule to OPENED when the open date has passed.
// Only the owner may trigger the state transition; the open date remains the
// temporal gate. Restricting to the owner prevents non-owners from mutating
// capsule state and keeps state changes auditable to a single actor.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest, { params }: RouteParams) {
  // TODO: replace with real auth — x-user-id is forgeable (IDOR risk)
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const capsule = await prisma.capsule.findUnique({
    where: { id },
    include: { media: true, sharedWith: true },
  });

  if (!capsule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the owner may trigger the LOCKED→OPENED transition.
  if (capsule.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isEligibleToOpen(capsule)) {
    const reason =
      capsule.status === "OPENED"
        ? "Capsule is already opened"
        : `Capsule cannot be opened until ${capsule.openDate.toISOString()}`;
    return NextResponse.json({ error: reason }, { status: 409 });
  }

  const opened = await prisma.capsule.update({
    where: { id },
    data: { status: "OPENED", openedAt: new Date() },
    include: { media: true, sharedWith: true },
  });

  const showContent = canViewContent(opened, userId);
  const detail = serialiseCapsuleDetail(opened);

  if (!showContent) {
    return NextResponse.json({ capsule: { ...detail, description: null, media: [] } });
  }

  return NextResponse.json({ capsule: detail });
}
