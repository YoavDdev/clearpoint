import { createClient } from "@supabase/supabase-js";
import { NotificationsContent } from "./NotificationsContent";
import { Mail } from "lucide-react";

export default async function NotificationsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get recent alerts
  const { data: alerts } = await supabase
    .from("system_alerts")
    .select(`
      *,
      camera:cameras(name, user:users(full_name, email))
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get customers for email composer
  const { data: customers } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name");

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Mail size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800">התראות ומיילים</h1>
            <p className="text-slate-600 mt-1">ניהול הודעות והתראות מערכת</p>
          </div>
        </div>
      </div>

      <NotificationsContent alerts={alerts || []} customers={customers || []} />
    </div>
  );
}
