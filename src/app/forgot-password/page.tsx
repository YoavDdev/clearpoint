"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Mail, ArrowRight, KeyRound } from "lucide-react";

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
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mb-4 shadow-lg">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">שכחת סיסמה?</h1>
          <p className="text-slate-600">נשלח לך קישור לאיפוס הסיסמה</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            {!message ? (
              <div className="space-y-5">
                {/* Email Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 text-right">
                    כתובת אימייל
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      disabled={loading}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-right">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleResetPassword}
                  disabled={loading || !email}
                  className="w-full py-4 bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>שולח...</span>
                    </>
                  ) : (
                    "שלח קישור איפוס"
                  )}
                </button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>חזרה להתחברות</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {/* Success State */}
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                  {message}
                </div>
                <p className="text-slate-600 text-sm">בדוק את תיבת הדואר שלך (כולל ספאם)</p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזרה להתחברות</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
