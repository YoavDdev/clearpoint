import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// GET /api/user/invoices - חשבוניות של המשתמש המחובר
export async function GET(req: NextRequest) {
  try {
    // בדיקת אימות דרך NextAuth
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // יצירת Supabase client עם service role לשליפת נתונים
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קבלת פרטי המשתמש
    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`🔍 Fetching invoices for user: ${user.email} (${user.full_name}) - ID: ${user.id}`);

    // שליפת החשבוניות
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        *,
        payment:payments (
          id,
          status,
          amount,
          paid_at,
          provider_transaction_id,
          metadata
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log(`📄 Found ${invoices?.length || 0} invoices for user ${user.email}`);

    if (error) {
      console.error("Error fetching user invoices:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Error in user invoices API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
