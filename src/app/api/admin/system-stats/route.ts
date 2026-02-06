import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { count: totalVodFiles } = await supabase
      .from("vod_files")
      .select("*", { count: "exact", head: true });

    const { count: vodFilesWithObjectKey } = await supabase
      .from("vod_files")
      .select("*", { count: "exact", head: true })
      .not("object_key", "is", null);

    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { count: activeSubscriptions } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: activeRecurringPayments } = await supabase
      .from("recurring_payments")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_valid", true);

    const { count: totalCameras } = await supabase
      .from("cameras")
      .select("*", { count: "exact", head: true });

    const { count: activeCameras } = await supabase
      .from("cameras")
      .select("*", { count: "exact", head: true })
      .eq("is_stream_active", true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: filesLast30Days } = await supabase
      .from("vod_files")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: allUsers } = await supabase
      .from("users")
      .select("id, full_name, email, plan_duration_days, created_at")
      .order("created_at", { ascending: false });

    const { data: allCameras } = await supabase
      .from("cameras")
      .select("user_id");

    const { data: allVodFiles } = await supabase
      .from("vod_files")
      .select("user_id");

    const { data: allSubscriptions } = await supabase
      .from("subscriptions")
      .select("user_id, status");

    const { data: allRecurringPayments } = await supabase
      .from("recurring_payments")
      .select("user_id, is_active, is_valid");

    const cameraCounts = (allCameras || []).reduce((acc: any, cam: any) => {
      acc[cam.user_id] = (acc[cam.user_id] || 0) + 1;
      return acc;
    }, {});

    const vodFileCounts = (allVodFiles || []).reduce((acc: any, file: any) => {
      acc[file.user_id] = (acc[file.user_id] || 0) + 1;
      return acc;
    }, {});

    const processedCustomers = (allUsers || []).map((user: any) => ({
      id: user.id,
      name: user.full_name || user.email,
      email: user.email,
      cameras: cameraCounts[user.id] || 0,
      vodFiles: vodFileCounts[user.id] || 0,
      retention: user.plan_duration_days || 14,
      hasActiveSubscription: 
        (allSubscriptions || []).some((s: any) => s.user_id === user.id && s.status === "active") ||
        (allRecurringPayments || []).some((r: any) => r.user_id === user.id && r.is_active && r.is_valid),
      joinedAt: user.created_at
    }));

    processedCustomers.sort((a, b) => b.vodFiles - a.vodFiles);

    const estimatedStorageGB = (totalVodFiles || 0) * 0.015;
    const estimatedB2Cost = estimatedStorageGB * 0.005;
    const estimatedBandwidthTB = estimatedStorageGB / 1000;
    const estimatedBunnyCost = estimatedBandwidthTB * 10;

    return NextResponse.json({
      success: true,
      data: {
        storage: {
          totalVodFiles: totalVodFiles || 0,
          vodFilesWithObjectKey: vodFilesWithObjectKey || 0,
          backfillProgress: (totalVodFiles && vodFilesWithObjectKey !== null) ? (((vodFilesWithObjectKey || 0) / totalVodFiles) * 100).toFixed(1) : "0",
          estimatedStorageGB: estimatedStorageGB.toFixed(2),
          estimatedB2CostUSD: estimatedB2Cost.toFixed(2),
          estimatedBunnyCostUSD: estimatedBunnyCost.toFixed(2),
          filesLast30Days: filesLast30Days || 0,
        },
        users: {
          total: totalUsers || 0,
          activeSubscriptions: (activeSubscriptions || 0) + (activeRecurringPayments || 0),
          activeRecurringPayments: activeRecurringPayments || 0,
          activeOneTimeSubscriptions: activeSubscriptions || 0,
          topByStorage: processedCustomers.slice(0, 10),
          allCustomers: processedCustomers,
        },
        cameras: {
          total: totalCameras || 0,
          active: activeCameras || 0,
          offline: (totalCameras || 0) - (activeCameras || 0),
        },
        system: {
          supabaseDbSizeMB: ((totalVodFiles || 0) * 0.001).toFixed(2),
          apiCallsEstimate: ((totalVodFiles || 0) * 2).toFixed(0),
        }
      }
    });
  } catch (error: any) {
    console.error("Error fetching system stats:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch stats" 
    }, { status: 500 });
  }
}
