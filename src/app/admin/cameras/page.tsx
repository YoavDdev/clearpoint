import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DeleteButton } from "./DeleteButton";
import Link from "next/link";

// ✅ Type definition for cameras
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

  // ✅ Normalize `user` from array to object (if needed)
  const cameras = (data || []).map((cam: any) => ({
    ...cam,
    user: Array.isArray(cam.user) ? cam.user[0] || null : cam.user,
  })) as Camera[];

  return (
    <main className="pt-20 p-6 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">ניהול מצלמות</h1>
        <span className="text-sm text-gray-500">
          {cameras.length} מצלמות פעילות
        </span>
      </div>

      {cameras.length === 0 ? (
        <p className="text-gray-600">לא נמצאו מצלמות.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-right">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  שם מצלמה
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  מספר סידורי
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  בעלים
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  סטטוס
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-right">
              {cameras.map((camera) => {
                const isOnline = camera.is_stream_active === true;

                return (
                  <tr key={camera.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{camera.name}</td>
                    <td className="px-4 py-3">{camera.serial_number}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {camera.user?.full_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            isOnline
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isOnline ? "פעיל" : "לא פעיל"}
                        </span>
                        {camera.last_seen_at && (
                          <span className="text-[10px] text-gray-400 mt-1">
                            נראה לאחרונה:{" "}
                            {new Date(camera.last_seen_at).toLocaleTimeString(
                              "he-IL"
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 flex gap-3 justify-end">
                      {isOnline ? (
                        <Link href={`/admin/live/${camera.id}`}>
                          <button className="text-blue-600 text-sm hover:underline">
                            צפייה בשידור חי
                          </button>
                        </Link>
                      ) : (
                        <button className="text-gray-400 text-sm cursor-not-allowed">
                          צפייה בשידור חי
                        </button>
                      )}
                      <DeleteButton cameraId={camera.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
