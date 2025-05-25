import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  type PlanJoin = {
    plan_id: string;
    custom_price: number | null;
    plan_duration_days: number | null;
    plan: {
      name: string;
      monthly_price: number;
      retention_days: number;
      connection_type: string;
      cloud_enabled: boolean;
      live_enabled: boolean;
    };
  };

  const { data, error } = await supabase
    .from("users")
    .select(
      `
    plan_id,
    custom_price,
    plan_duration_days,
    plan:plans (
      name,
      monthly_price,
      retention_days,
      connection_type,
      cloud_enabled,
      live_enabled
    )
  `
    )
    .eq("email", session.user.email)
    .single<PlanJoin>();

  if (error || !data || !data.plan) {
    return NextResponse.json(
      { success: false, error: "User or plan not found" },
      { status: 404 }
    );
  }

  const plan = {
    id: data.plan_id,
    name: data.plan.name,
    price: data.plan.monthly_price,
    retention_days: data.plan_duration_days ?? data.plan.retention_days,
    connection: data.plan.connection_type,
    cloud: data.plan.cloud_enabled,
    live: data.plan.live_enabled,
  };

  return NextResponse.json({
    success: true,
    plan,
    custom_price: data.custom_price ?? null,
  });
}
