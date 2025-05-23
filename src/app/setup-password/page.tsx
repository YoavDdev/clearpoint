"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SetupPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const expires_at = parseInt(hashParams.get("expires_at") || "0", 10);
      const token_type = hashParams.get("token_type");

      if (access_token && refresh_token && token_type && expires_at) {
        console.log("🔐 Manually setting Supabase session");

        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error || !data.session) {
          console.error("❌ Failed to set session manually", error);
          setError("קישור לא תקין או שפג תוקפו. בקש הזמנה חדשה.");
        } else {
          console.log("✅ Session set manually");
          setError("");
        }
      } else {
        console.warn("❌ Missing access_token or refresh_token in URL hash");
        setError("קישור לא תקין או שפג תוקפו. בקש הזמנה חדשה.");
      }
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

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("שגיאה בשמירת הסיסמה: " + error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-right">
        <h1 className="text-2xl font-bold mb-4">הגדרת סיסמה</h1>
        <p className="mb-4 text-gray-600">
          בחר/י סיסמה חדשה כדי להשלים את ההרשמה שלך למערכת Clearpoint.
        </p>

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full p-2 border border-gray-300 rounded text-right pr-10"
            placeholder="סיסמה חדשה"
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
          {loading ? "שומר..." : "שמור והמשך"}
        </button>

        {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
        {success && <p className="mt-4 text-green-600 text-sm">סיסמה נשמרה בהצלחה! מועבר/ת ללוח הבקרה...</p>}
      </div>
    </main>
  );
}
