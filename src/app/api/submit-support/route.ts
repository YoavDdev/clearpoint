// /app/api/submit-support/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const message = body.message?.trim();
  const userEmail = session?.user?.email;

  if (!userEmail || !message) {
    return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .single();

  const { error } = await supabase.from("support_requests").insert({
    email: userEmail,
    message,
    user_id: user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
