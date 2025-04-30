import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CamerasTable } from "./CamerasTable"; // 👈 make sure the path is correct

// ✅ Type definition
type Camera = {
  id: string;
  name: string;
  image_url: string;
  serial_number: string;
  last_seen_at: string | null;
  is_stream_active: boolean | null;
  user: {
    full_name: string;
  } | null;
};

export default async function CamerasPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "Admin") {
    redirect("/dashboard");
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.from("cameras").select(`
    id,
    name,
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
    <main className="pt-20 p-6 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">ניהול מצלמות</h1>
          <span className="text-sm text-gray-500">{cameras.length} מצלמות פעילות</span>
        </div>
        <Link
          href="/admin/cameras/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          הוספת מצלמה חדשה
        </Link>
      </div>

      <CamerasTable cameras={cameras} />
    </main>
  );
}
