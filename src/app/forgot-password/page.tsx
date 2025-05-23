"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ForgotPasswordPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      setError("שגיאה בשליחת הקישור: " + error.message);
    } else {
setMessage("אם כתובת המייל קיימת במערכת, נשלח אליך קישור לאיפוס סיסמה.");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-right">
        <h1 className="text-2xl font-bold mb-4">שחזור סיסמה</h1>
        <p className="mb-4 text-gray-600">
          הזן את כתובת המייל שלך ואנחנו נשלח לך קישור לאיפוס הסיסמה.
        </p>

        <input
          type="email"
          placeholder="example@email.com"
          className="w-full p-2 border border-gray-300 rounded mb-4 text-right"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleResetPassword}
          disabled={loading || !email}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700"
        >
          {loading ? "שולח..." : "שלח קישור איפוס"}
        </button>

        {message && <p className="mt-4 text-green-600 text-sm">{message}</p>}
        {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      </div>
    </main>
  );
}
