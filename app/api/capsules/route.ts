import { NextResponse } from "next/server";
import { createCapsule, listCapsules } from "@/lib/capsules/repository";
import { CapsuleValidationError } from "@/lib/capsules/model";
import {
  filterReadableCapsules,
  parseCapsuleCreateBody,
  requesterIdFromHeaders,
  toCapsuleResponse,
} from "@/lib/capsules/http";

export async function GET(request: Request) {
  const requesterId = requesterIdFromHeaders(request.headers);
  const capsules = filterReadableCapsules(listCapsules(), requesterId).map((capsule) =>
    toCapsuleResponse(capsule, requesterId),
  );

  return NextResponse.json({ capsules });
}

export async function POST(request: Request) {
  const requesterId = requesterIdFromHeaders(request.headers);

  if (!requesterId) {
    return NextResponse.json({ error: "x-user-id header is required" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "request body must be valid JSON" }, { status: 400 });
  }

  try {
    const capsule = createCapsule(parseCapsuleCreateBody(payload as Record<string, unknown>, requesterId));
    return NextResponse.json({ capsule: toCapsuleResponse(capsule, requesterId) }, { status: 201 });
  } catch (error) {
    if (error instanceof CapsuleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
