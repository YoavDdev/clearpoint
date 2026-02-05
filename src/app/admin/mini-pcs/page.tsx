import { createClient } from "@supabase/supabase-js";
import { MiniPCsTable } from "./MiniPCsTable";
import Link from "next/link";
import { Monitor, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

export const dynamic = 'force-dynamic';

type MiniPC = {
  id: string;
  device_name: string;
  hostname: string;
  ip_address: string;
  user_id: string;
  installed_at: string;
  last_seen_at: string | null;
  is_active: boolean;
  user: {
    full_name: string;
    email: string;
  } | null;
  camera_count: number;
};

export default async function MiniPCsPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.from("mini_pcs").select(`
    id,
    device_name,
    hostname,
    ip_address,
    user_id,
    installed_at,
    last_seen_at,
    is_active,
    user:users!mini_pcs_user_id_fkey (full_name, email),
    cameras (id)
  `);

  if (error) {
    throw new Error("Failed to fetch Mini PCs: " + error.message);
  }

  const miniPCs = (data || []).map((pc: any) => ({
    ...pc,
    user: Array.isArray(pc.user) ? pc.user[0] || null : pc.user,
    camera_count: pc.cameras?.length || 0,
  })) as MiniPC[];

  return (
    <AdminPageShell>
      <div className="mb-6">
        <AdminPageHeader
          title="ניהול Mini PC"
          subtitle="מעקב אחר מחשבי Mini PC ובריאותם"
          icon={Monitor}
          tone="blue"
        />
      </div>

      <MiniPCsTable miniPCs={miniPCs} />
    </AdminPageShell>
  );
}
