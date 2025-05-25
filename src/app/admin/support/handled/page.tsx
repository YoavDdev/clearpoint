'use client';

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface SupportRequest {
  id: string;
  email: string;
  message: string;
  created_at: string;
  is_handled: boolean;
  user_id?: string;
  category?: string;
  file_url?: string;
}

const categoryMap: Record<string, string> = {
  billing: "בקשת תשלום",
  technical: "בעיה טכנית",
  question: "שאלה",
  other: "אחר",
};

export default function HandledSupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      const res = await fetch("/api/admin-get-support");
      const data = await res.json();
      const handled = data.requests?.filter((r: SupportRequest) => r.is_handled) || [];
      setRequests(handled);
      setLoading(false);
    }
    fetchRequests();
  }, []);

  return (
    <main dir="rtl" className="max-w-3xl mx-auto pt-20 px-6">
      <h1 className="text-2xl font-bold mb-6 text-center">בקשות שטופלו</h1>

      <Link
        href="/admin/support"
        className="text-sm text-blue-500 hover:underline text-center block my-4"
      >
        ← חזור לבקשות חדשות
      </Link>

      {loading ? (
        <p className="text-center text-gray-500">טוען נתונים...</p>
      ) : requests.length === 0 ? (
        <p className="text-center text-gray-500">אין בקשות שטופלו.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-gray-50 p-4 border rounded-xl shadow space-y-2"
            >
              <p><span className="font-medium">אימייל:</span> {req.email}</p>
              <p>
                <span className="font-medium">קטגוריה:</span>{" "}
                {categoryMap[req.category ?? ""] || "לא צוינה"}
              </p>
              <p><span className="font-medium">הודעה:</span> {req.message}</p>

              {req.file_url && (
                <a
                  href={req.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:underline"
                >
                  📎 קובץ מצורף
                </a>
              )}

              <p className="text-sm text-gray-500">
                התקבלה: {format(new Date(req.created_at), "dd/MM/yyyy HH:mm")}
              </p>
              <p className="text-green-600 text-sm font-medium">✅ טופל</p>

              {req.user_id && (
                <a
                  href={`/admin/customers/${req.user_id}`}
                  className="text-blue-600 hover:underline text-sm block"
                >
                  👤 לקוח
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
