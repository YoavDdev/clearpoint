import { createClient } from "@supabase/supabase-js";
import { CamerasTable } from "./CamerasTable";
import Link from "next/link";
import { Camera, Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

// ✅ Match your Camera type
type Camera = {
  id: string;
  name: string;
  stream_path: string;
  user_id: string;
  mini_pc_id: string | null;
  image_url: string;
  serial_number: string;
  last_seen_at: string | null;
  is_stream_active: boolean | null;
  user: {
    full_name: string;
  } | null;
};

export default async function CamerasPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.from("cameras").select(`
    id,
    name,
    stream_path,
    user_id,
    mini_pc_id,
    image_url,
    serial_number,
    last_seen_at,
    is_stream_active,
    user:users!cameras_user_id_fkey (full_name)
  `);

  if (error) {
    throw new Error("Failed to fetch cameras: " + error.message);
  }

  const cameras = (data || []).map((cam: any) => ({
    ...cam,
    user: Array.isArray(cam.user) ? cam.user[0] || null : cam.user,
  })) as Camera[];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">ניהול מצלמות</h1>
              <p className="text-slate-600">ניטור וניהול כל המצלמות במערכת</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Camera size={32} className="text-white" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/admin/cameras/new"
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all hover:shadow-lg group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform" />
              <span>הוסף מצלמה חדשה</span>
            </Link>
          </div>
        </div>
        
        <CamerasTable cameras={cameras} />
      </div>
    </main>
  );
}
