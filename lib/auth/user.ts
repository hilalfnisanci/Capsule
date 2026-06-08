const DEV_USER_HEADER = "x-user-id";

export function getAuthenticatedUserId(request: { headers: Headers }): string | null {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.CAPSULE_ENABLE_DEV_USER_HEADER === "true"
  ) {
    const userId = request.headers.get(DEV_USER_HEADER)?.trim();
    return userId || null;
  }

  return null;
}
