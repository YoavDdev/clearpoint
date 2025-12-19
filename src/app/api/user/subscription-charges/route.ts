import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא את המנוי של המשתמש
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!subscription) {
      return NextResponse.json({
        success: true,
        charges: [],
        message: "No subscription found"
      });
    }

    // שלוף את כל החיובים
    const { data: charges, error } = await supabase
      .from("subscription_charges")
      .select("*")
      .eq("subscription_id", subscription.id)
      .order("charged_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching charges:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      charges: charges || [],
      count: charges?.length || 0
    });

  } catch (error) {
    console.error("Subscription charges error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription charges" },
      { status: 500 }
    );
  }
}
