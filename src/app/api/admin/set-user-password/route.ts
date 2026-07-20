import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/admin-auth";

export const POST = apiHandler(async (req: Request) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { userId, password } = await req.json();

  if (!userId || !password) {
    return NextResponse.json(
      { success: false, error: "Missing userId or password" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Verify user exists
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // Set password directly via admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      password,
      email_confirm: true,
    }
  );

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    email: user.email,
    message: `Password set for ${user.email}`,
  });
});
