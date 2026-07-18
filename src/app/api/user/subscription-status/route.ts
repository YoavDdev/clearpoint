import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * Lightweight subscription check used by middleware to gate access.
 * Returns { hasAccess: boolean }
 */
export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ hasAccess: false }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, status")
    .eq("email", session.user.email)
    .single();

  if (userError || !user) {
    return NextResponse.json({ hasAccess: false });
  }

  // Check for an active AND valid recurring payment
  const { data: recurring } = await supabase
    .from("recurring_payments")
    .select("id, is_valid")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Access granted if:
  // 1. User has an active + valid recurring payment, OR
  // 2. User status is 'active' and has no recurring payment yet (grace / setup period)
  const hasAccess = recurring
    ? recurring.is_valid === true
    : user.status === 'active';

  return NextResponse.json({ hasAccess });
});
