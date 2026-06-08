import { NextResponse } from "next/server";
import { canReadCapsuleMetadata } from "@/lib/capsules/model";
import { requesterIdFromHeaders, toCapsuleResponse } from "@/lib/capsules/http";
import { getCapsuleById } from "@/lib/capsules/repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requesterId = requesterIdFromHeaders(request.headers);
  const { id } = await context.params;
  const capsule = getCapsuleById(id);

  if (!capsule || !canReadCapsuleMetadata(capsule, { requesterId })) {
    return NextResponse.json({ error: "capsule not found" }, { status: 404 });
  }

  return NextResponse.json({ capsule: toCapsuleResponse(capsule, requesterId) });
}
