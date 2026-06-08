import { NextResponse } from "next/server";
import { CapsuleAccessError } from "@/lib/capsules/model";
import { requesterIdFromHeaders, toCapsuleResponse } from "@/lib/capsules/http";
import { markCapsuleOpened } from "@/lib/capsules/repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requesterId = requesterIdFromHeaders(request.headers);

  if (!requesterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const capsule = markCapsuleOpened(id, requesterId);

    if (!capsule) {
      return NextResponse.json({ error: "capsule not found" }, { status: 404 });
    }

    return NextResponse.json({ capsule: toCapsuleResponse(capsule, requesterId) });
  } catch (error) {
    if (error instanceof CapsuleAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    throw error;
  }
}
