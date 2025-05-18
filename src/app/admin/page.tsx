import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export default async function AdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: activeCameras } = await supabase
    .from("cameras")
    .select("*", { count: "exact", head: true })
    .eq("is_stream_active", true);

  return (
    <main className="min-h-screen bg-gray-100 pt-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-right">ניהול המערכת</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/admin/customers"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">📋 ניהול לקוחות</h2>
            <p className="text-gray-600 text-sm">
              צפה, ערוך או מחק לקוחות קיימים
            </p>
          </Link>

          <Link
            href="/admin/customers/new"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">➕ הוספת לקוח</h2>
            <p className="text-gray-600 text-sm">הוסף לקוח חדש למערכת</p>
          </Link>

          <Link
            href="/admin/cameras"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">🎥 ניהול מצלמות</h2>
            <p className="text-gray-600 text-sm">צפה והפעל מצלמות של הלקוחות</p>
          </Link>

          <Link
            href="/admin/cameras/new"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">➕ הוספת מצלמה</h2>
            <p className="text-gray-600 text-sm">שייך מצלמה חדשה למשתמש</p>
          </Link>

          <Link
            href="/admin/requests"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">📝 בקשות להרשמה</h2>
            <p className="text-gray-600 text-sm">
              צפה בכל הפניות שהתקבלו מהאתר
            </p>
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📊 סטטיסטיקות</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <h3 className="text-2xl font-bold text-blue-600">
                {userCount ?? "--"}
              </h3>
              <p className="text-sm text-gray-600">לקוחות רשומים</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <h3 className="text-2xl font-bold text-green-600">
                {activeCameras ?? "--"}
              </h3>
              <p className="text-sm text-gray-600">מצלמות פעילות</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <h3 className="text-2xl font-bold text-yellow-600">--</h3>
              <p className="text-sm text-gray-600">אירועים אחרונים</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
