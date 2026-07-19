"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ResendInviteButtonProps {
  userId: string;
}

export default function ResendInviteButton({ userId }: ResendInviteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    if (!confirm("לשלוח קישור כניסה חדש ללקוח?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setTimeout(() => setSent(false), 5000);
      } else {
        alert("שגיאה: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("שגיאה בשליחת הקישור");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleResend}
      disabled={loading || sent}
      className={`group rounded-2xl shadow-sm border p-6 transition-all text-right w-full ${
        sent
          ? "bg-green-50 border-green-300"
          : "bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:shadow-lg hover:border-orange-400"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-right flex-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2 justify-end">
            <span>{sent ? "נשלח!" : "שלח קישור כניסה"}</span>
            <Send className={sent ? "text-green-600" : "text-orange-600"} size={22} />
          </h3>
          <p className="text-sm text-slate-600">
            {sent ? "הקישור נשלח בהצלחה למייל הלקוח" : "שליחת לינק הזמנה חדש למייל"}
          </p>
        </div>
      </div>
      <div className={`flex items-center justify-end gap-2 font-semibold ${sent ? "text-green-600" : "text-orange-600"}`}>
        <span className="text-sm">
          {loading ? "שולח..." : sent ? "✅ נשלח" : "שלח עכשיו"}
        </span>
      </div>
    </button>
  );
}
