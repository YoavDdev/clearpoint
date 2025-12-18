import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

type Plan = {
  name: string;
  name_he: string;
  monthly_price: number;
  setup_price: number;
  retention_days: number;
  connection_type: string;
  data_allowance_gb: number | null;
  camera_limit: number;
};

type UserWithPlan = {
  plan_id: string;
  custom_price: number | null;
  plan_duration_days: number | null;
  setup_paid: boolean | null;
  plan: Plan;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.error("❌ No session or email found.");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("users")
      .select(
        `
        plan_id,
        custom_price,
        plan_duration_days,
        setup_paid,
        plan:plans (
          name,
          name_he,
          monthly_price,
          setup_price,
          retention_days,
          connection_type,
          data_allowance_gb,
          camera_limit
        )
      `
      )
      .eq("email", session.user.email)
      .single<UserWithPlan>(); // ✅ cast type here

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    if (!data) {
      console.error("❌ No user found for email:", session.user.email);
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!data.plan) {
      console.error("❌ No plan found for user:", data.plan_id);
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const plan = {
      id: data.plan_id,
      name: data.plan.name,
      name_he: data.plan.name_he,
      monthly_price: data.plan.monthly_price,
      setup_price: data.plan.setup_price,
      retention_days: data.plan_duration_days ?? data.plan.retention_days,
      connection_type: data.plan.connection_type,
      data_allowance_gb: data.plan.data_allowance_gb,
      camera_limit: data.plan.camera_limit,
    };

    return NextResponse.json({
      success: true,
      plan,
      custom_price: data.custom_price ?? null,
      setup_paid: data.setup_paid ?? false,
    });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
