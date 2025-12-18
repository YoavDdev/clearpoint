import { createClient } from "@supabase/supabase-js";
import { MiniPCsTable } from "./MiniPCsTable";
import Link from "next/link";
import { Monitor, Plus } from "lucide-react";

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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">ניהול Mini PC</h1>
              <p className="text-slate-600">מעקב אחר מחשבי Mini PC ובריאותם</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Monitor size={32} className="text-white" />
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-4 mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>חזרה לדשבורד</span>
            </Link>
            <Link
              href="/admin/cameras"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>מצלמות</span>
            </Link>
          </div>
        </div>

        <MiniPCsTable miniPCs={miniPCs} />
      </div>
    </main>
  );
}
