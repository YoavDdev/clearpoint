"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  retention_days: number;
  connection_type: string;
}

export default function NewCustomerPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [retention, setRetention] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [tunnelName, setTunnelName] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();

  // ✅ Load plans
  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []));
  }, []);

  // ✅ Populate from query string if needed
  useEffect(() => {
    const fullName = searchParams.get("fullName");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const address = searchParams.get("address");

    if (fullName) setFullName(fullName);
    if (email) setEmail(email);
    if (phone) setPhone(phone);
    if (address) setAddress(address);
  }, [searchParams]);

  // ✅ Auto-fill price & retention when plan changes
  useEffect(() => {
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      setCustomPrice(selected.monthly_price);
      setRetention(selected.retention_days);
    }
  }, [planId]);

  const handleCreateCustomer = async () => {
    if (!planId || !retention) {
      alert("יש לבחור מסלול מנוי ומשך שמירת קבצים.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/admin-invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        phone,
        address,
        notes,
        plan_type: planId, // legacy field name
        plan_duration_days: retention,
        custom_price: customPrice,
        tunnel_name: tunnelName,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      alert("שגיאה ביצירת לקוח: " + result.error);
      console.error(result.error);
    } else {
      alert("✅ הלקוח נוצר בהצלחה!");
    }

    setEmail("");
    setFullName("");
    setPlanId(null);
    setRetention(null);
    setCustomPrice(null);
    setPhone("");
    setAddress("");
    setNotes("");
    setTunnelName("");
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
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* Phone */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">טלפון</label>
          <input
            type="tel"
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
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Tunnel Name */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">שם טאנל (tunnel_name)</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={tunnelName}
            onChange={(e) => setTunnelName(e.target.value)}
            placeholder="example-tunnel"
          />
        </div>

        {/* Notes */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">הערות</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Plan */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">מסלול מנוי</label>
          <select
            value={planId ?? ""}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-right"
          >
            <option value="" disabled>בחר מסלול</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.connection_type})
              </option>
            ))}
          </select>
        </div>

        {/* Retention */}
        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">משך שמירת קבצים</label>
          <select
            value={retention ?? ""}
            onChange={(e) => setRetention(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded text-right"
          >
            <option value="" disabled>בחר תקופה</option>
            <option value={7}>7 ימים</option>
            <option value={14}>14 ימים</option>
          </select>
        </div>

        {/* Custom Price */}
        <div className="mb-6 text-right">
          <label className="block mb-2 font-medium">מחיר חודשי מותאם (אופציונלי)</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={customPrice ?? ""}
            onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        {/* Submit */}
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
