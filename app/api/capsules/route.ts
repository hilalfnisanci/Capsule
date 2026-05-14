import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidOpenDate } from "@/lib/capsule/access";
import { serialiseCapsule } from "@/lib/capsule/serialise";
import type { CreateCapsuleInput } from "@/lib/capsule/types";

// ---------------------------------------------------------------------------
// GET /api/capsules
// List capsules accessible to the current user.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const capsules = await prisma.capsule.findMany({
    where: {
      OR: [
        { userId },
        { visibility: "PUBLIC" },
        { visibility: "SHARED", sharedWith: { some: { userId } } },
      ],
    },
    include: { media: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ capsules: capsules.map(serialiseCapsule) });
}

// ---------------------------------------------------------------------------
// POST /api/capsules
// Create a new capsule (LOCKED, owned by the requesting user).
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateCapsuleInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, visibility = "PRIVATE", openDate: openDateStr } = body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title is required" }, { status: 422 });
  }

  if (!openDateStr) {
    return NextResponse.json({ error: "openDate is required" }, { status: 422 });
  }

  const openDate = new Date(openDateStr);
  if (isNaN(openDate.getTime())) {
    return NextResponse.json(
      { error: "openDate must be a valid ISO 8601 date string" },
      { status: 422 }
    );
  }

  if (!isValidOpenDate(openDate)) {
    return NextResponse.json(
      { error: "openDate must be a future date" },
      { status: 422 }
    );
  }

  if (!["PRIVATE", "SHARED", "PUBLIC"].includes(visibility)) {
    return NextResponse.json({ error: "invalid visibility value" }, { status: 422 });
  }

  const capsule = await prisma.capsule.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      userId,
      visibility,
      openDate,
    },
    include: { media: true },
  });

  return NextResponse.json({ capsule: serialiseCapsule(capsule) }, { status: 201 });
}
