"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  hasActiveSubscription: boolean;
  monthlyPrice?: number;
}

export default function ActivateSubscriptionButton({
  userId,
  userName,
  userEmail,
  hasActiveSubscription,
  monthlyPrice = 100,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!confirm(`להפעיל מנוי חודשי עבור ${userName}?\nמחיר: ₪${monthlyPrice}/חודש`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: monthlyPrice,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        alert(`✅ מנוי הופעל בהצלחה!\n\nכעת צור הוראת קבע ב-PayPlus:\n1. היכנס ל-PayPlus Dashboard\n2. צור הוראת קבע חדשה\n3. מייל לקוח: ${userEmail}\n4. סכום: ₪${monthlyPrice}\n\nהמערכת תזהה אוטומטית את החיובים החודשיים!`);
        window.location.reload();
      } else {
        alert(`❌ שגיאה: ${data.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ שגיאה בהפעלת מנוי");
    } finally {
      setLoading(false);
    }
  };

  if (hasActiveSubscription) {
    return (
      <div className="flex items-center gap-2 text-green-600 font-medium">
        <CheckCircle className="w-5 h-5" />
        <span>מנוי פעיל</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading || success}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 font-bold"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>מפעיל...</span>
        </>
      ) : success ? (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>הופעל!</span>
        </>
      ) : (
        <span>🎯 הפעל מנוי חודשי</span>
      )}
    </button>
  );
}
