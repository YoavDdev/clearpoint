import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: templates, error } = await supabase
      .from("item_templates")
      .select("*")
      .eq("is_active", true)
      .order("item_type", { ascending: true })
      .order("default_price", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
    });
  } catch (error) {
    console.error("Error fetching item templates:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
