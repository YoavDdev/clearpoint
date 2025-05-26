import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("plans")
    .select("id, name, monthly_price, retention_days, connection_type")
    .order("monthly_price", { ascending: true });

  if (error) {
    console.error("❌ Failed to fetch plans:", error.message);
    return NextResponse.json(
      { success: false, error: "Failed to load plans" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, plans: data });
}
