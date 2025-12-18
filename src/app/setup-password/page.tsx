"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Lock, Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function SetupPasswordPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSupabase(createClientComponentClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;
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
  }, [supabase]);

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
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">הגדרת סיסמה</h1>
          <p className="text-slate-600">השלם את ההרשמה למערכת Clearpoint</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            {!success ? (
              <div className="space-y-5">
                {/* Password Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 text-right">
                    בחר סיסמה
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="לפחות 8 תווים, אות גדולה וספרה"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      disabled={loading}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 text-right">
                    הסיסמה חייבת לכלול: 8+ תווים, אות גדולה, וספרה
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-right">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSetPassword}
                  disabled={loading || !password}
                  className="w-full py-4 bg-gradient-to-l from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>שומר...</span>
                    </>
                  ) : (
                    "שמור והמשך"
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {/* Success State */}
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                  סיסמה נשמרה בהצלחה!
                </div>
                <p className="text-slate-600 text-sm">מעביר אותך ללוח הבקרה...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
