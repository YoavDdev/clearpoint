import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Verify the current request is from an authenticated admin user.
 * Returns the session if valid, or a 403 NextResponse if not.
 *
 * Usage:
 *   const authResult = await requireAdmin();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const session = authResult; // safe to use
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }
  return session;
}
