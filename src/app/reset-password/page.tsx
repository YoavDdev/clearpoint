"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!data?.session || error) {
        console.warn("❌ No active session found after redirect", error);
        setError("קישור לא תקין או שפג תוקפו. בקש קישור חדש.");
      } else {
        console.log("✅ Session is already active");
      }

      setSessionChecked(true);
    };

    init();
  }, []);

  const isStrongPassword = (pwd: string) => {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const handleSetPassword = async () => {
    if (!isStrongPassword(password)) {
      setError("יש להזין סיסמה חזקה (לפחות 8 תווים, אות גדולה וספרה).");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("שגיאה באיפוס הסיסמה: " + error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (!sessionChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-center">
        <p className="text-gray-600">טוען...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-right">
        <h1 className="text-2xl font-bold mb-4">איפוס סיסמה</h1>
        <p className="mb-4 text-gray-600">הזן סיסמה חדשה כדי להשלים את האיפוס.</p>

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="סיסמה חדשה"
            className="w-full p-2 border border-gray-300 rounded text-right pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute inset-y-0 left-2 px-2 text-sm text-blue-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "הסתר" : "הצג"}
          </button>
        </div>

        <button
          onClick={handleSetPassword}
          disabled={loading || !password}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700"
        >
          {loading ? "שומר..." : "שמור סיסמה חדשה"}
        </button>

        {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
        {success && <p className="mt-4 text-green-600 text-sm">הסיסמה שונתה בהצלחה! מועבר/ת ללוח הבקרה...</p>}
      </div>
    </main>
  );
}
