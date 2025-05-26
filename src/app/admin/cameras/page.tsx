import { createClient } from "@supabase/supabase-js";
import { CamerasTable } from "./CamerasTable";
import Link from "next/link";


// ✅ Match your Camera type
type Camera = {
  id: string;
  name: string;
  stream_path: string;
  user_id: string;
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
    <main>
      <CamerasTable cameras={cameras} />
    </main>
  );
}
