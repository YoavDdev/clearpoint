import { createClient } from "@supabase/supabase-js";
import { CamerasTable } from "./CamerasTable";
import Link from "next/link";
import { ArrowRight, Camera, Monitor } from "lucide-react";
import { notFound } from "next/navigation";

type Camera = {
  id: string;
  name: string;
  stream_path: string;
  is_stream_active: boolean;
  created_at: string;
  mini_pc_id: string;
  user_id: string;
  user: {
    full_name: string;
    email: string;
  } | null;
};

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
};

export default async function MiniPCCamerasPage({
  params,
}: {
  params: { id: string };
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch Mini PC details
  const { data: miniPC, error: miniPCError } = await supabaseAdmin
    .from("mini_pcs")
    .select(`
      *,
      user:users(full_name, email)
    `)
    .eq("id", params.id)
    .single();

  if (miniPCError || !miniPC) {
    notFound();
  }

  // Fetch cameras for this Mini PC
  const { data: cameras, error: camerasError } = await supabaseAdmin
    .from("cameras")
    .select(`
      *,
      user:users(full_name, email)
    `)
    .eq("mini_pc_id", params.id)
    .order("created_at", { ascending: false });

  if (camerasError) {
    console.error("Error fetching cameras:", camerasError);
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Link
            href="/admin"
            className="hover:text-blue-600 transition-colors"
          >
            ניהול
          </Link>
          <ArrowRight size={16} className="rotate-180" />
          <Link
            href="/admin/mini-pcs"
            className="hover:text-blue-600 transition-colors"
          >
            Mini PCs
          </Link>
          <ArrowRight size={16} className="rotate-180" />
          <span className="text-slate-900 font-medium">{miniPC.device_name}</span>
          <ArrowRight size={16} className="rotate-180" />
          <span className="text-slate-900 font-medium">מצלמות</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Camera size={32} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  מצלמות - {miniPC.device_name}
                </h1>
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Monitor size={16} />
                    <span>{miniPC.hostname}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>לקוח:</span>
                    <span className="font-medium text-slate-900">
                      {miniPC.user?.full_name || "ללא לקוח"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>IP:</span>
                    <span className="font-mono text-slate-900">{miniPC.ip_address}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/mini-pcs/${params.id}`}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                פרטי Mini PC
              </Link>
              <Link
                href={`/admin/cameras/new?mini_pc_id=${params.id}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Camera size={20} />
                הוסף מצלמה
              </Link>
            </div>
          </div>
        </div>

        {/* Cameras Table */}
        <CamerasTable cameras={cameras || []} miniPCId={params.id} />
      </div>
    </div>
  );
}
