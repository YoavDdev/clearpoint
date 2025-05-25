"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function NewCustomerPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [retention, setRetention] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const fullName = searchParams.get("fullName");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const address = searchParams.get("address");
    const planLabel = searchParams.get("plan");

    if (fullName) setFullName(fullName);
    if (email) setEmail(email);
    if (phone) setPhone(phone);
    if (address) setAddress(address);

    if (planLabel) {
      if (planLabel.includes("אינטרנט")) setPlan("wifi");
      else if (planLabel.includes("סים")) setPlan("sim");
      else if (planLabel.includes("מקומי")) setPlan("local");
    }
  }, [searchParams]);

  const handleCreateCustomer = async () => {
    setLoading(true);

    if (!plan || !retention) {
      alert("יש לבחור מסלול מנוי ומשך שמירת קבצים.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin-invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        phone,
        address,
        notes,
        plan_type: plan,
        plan_duration_days: retention,
        custom_price: customPrice,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      alert("שגיאה ביצירת לקוח: " + result.error);
      console.error(result.error);
      setLoading(false);
      return;
    }

    alert("✅ הלקוח נוצר בהצלחה!\n\nקישור ההתחברות נשלח ללקוח.");
    console.log("Invite URL:", result.inviteUrl);

    setEmail("");
    setFullName("");
    setPlan(null);
    setRetention(null);
    setCustomPrice(null);
    setPhone("");
    setAddress("");
    setNotes("");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 pt-20 px-6 flex flex-col items-center">
      <div className="w-full max-w-xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-right">הוספת לקוח חדש</h1>

        {/* Email */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">אימייל</label>
          <input
            type="email"
            placeholder="example@email.com"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        {/* Full Name */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">שם מלא</label>
          <input
            type="text"
            placeholder="שם פרטי ומשפחה"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* Phone */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">מספר טלפון</label>
          <input
            type="tel"
            placeholder="050-0000000"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Address */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">כתובת</label>
          <input
            type="text"
            placeholder="עיר, רחוב, מספר"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">הערות</label>
          <textarea
            placeholder="מידע נוסף על הלקוח (לא חובה)"
            className="w-full p-2 border border-gray-300 rounded text-right"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Plan */}
        <div className="mb-6 text-right">
          <label className="block mb-2 font-medium">מסלול מנוי</label>
          <select
            value={plan ?? ""}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-right"
          >
            <option value="" disabled>בחר מסלול מנוי</option>
            <option value="sim">חבילת סים (SIM)</option>
            <option value="wifi">חבילת אינטרנט ביתי (Wi-Fi)</option>
            <option value="local">חבילת מקומית (Local)</option>
          </select>
        </div>

        {/* Retention */}
        <div className="mb-6 text-right">
          <label className="block mb-2 font-medium">משך שמירת קבצים</label>
          <select
            value={retention ?? ""}
            onChange={(e) => setRetention(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded text-right"
          >
            <option value="" disabled>בחר תקופת שמירה</option>
            <option value={7}>7 ימים</option>
            <option value={14}>14 ימים</option>
          </select>
        </div>

        {/* Custom Price */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">מחיר חודשי מותאם (אופציונלי)</label>
          <input
            type="number"
            placeholder="למשל 120"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={customPrice ?? ""}
            onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        {/* Submit Button */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          onClick={handleCreateCustomer}
          disabled={loading}
        >
          {loading ? "יוצר לקוח..." : "צור לקוח"}
        </button>
      </div>
    </main>
  );
}