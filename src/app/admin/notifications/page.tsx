import { createClient } from "@supabase/supabase-js";
import { NotificationsContent } from "./NotificationsContent";
import { Mail } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

export const dynamic = 'force-dynamic';

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
    <AdminPageShell>
      <div className="mb-6">
        <AdminPageHeader
          title="התראות ומיילים"
          subtitle="ניהול הודעות והתראות מערכת"
          icon={Mail}
          tone="blue"
        />
      </div>

      <NotificationsContent alerts={alerts || []} customers={customers || []} />
    </AdminPageShell>
  );
}
