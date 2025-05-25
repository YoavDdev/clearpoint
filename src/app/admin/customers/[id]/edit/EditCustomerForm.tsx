"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  user: {
    id: string;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    plan_id: string | null;
    plan_duration_days: number | null;
    custom_price: number | null;
  };
}

export default function EditCustomerForm({ user }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [address, setAddress] = useState(user.address || "");
  const [notes, setNotes] = useState(user.notes || "");
  const [plan, setPlan] = useState(user.plan_id || "local");
  const [retention, setRetention] = useState(user.plan_duration_days || 7);
  const [customPrice, setCustomPrice] = useState(user.custom_price?.toString() || "");

  const handleSave = async () => {
    setSaving(true);

    const response = await fetch("/api/admin-edit-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        full_name: fullName,
        phone,
        address,
        notes,
        plan_id: plan,
        plan_duration_days: retention,
        custom_price: customPrice ? Number(customPrice) : null,
      }),
    });

    setSaving(false);

    const result = await response.json();
    if (!result.success) {
      alert("שגיאה בשמירה: " + result.error);
    } else {
      alert("הלקוח עודכן בהצלחה!");
      router.push(`/admin/customers/${user.id}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 pt-20 px-6 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-xl">
        <div className="text-right mb-4">
          <Link href="/admin/customers" className="text-blue-600 hover:underline text-sm">
            ← חזרה לרשימת לקוחות
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-right">עריכת לקוח</h1>

        <div className="grid grid-cols-1 gap-5">
          <div className="text-right">
            <label className="block mb-1 font-medium">שם מלא</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="text-right">
            <label className="block mb-1 font-medium">טלפון</label>
            <input
              type="tel"
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="text-right">
            <label className="block mb-1 font-medium">כתובת</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="text-right">
            <label className="block mb-1 font-medium">הערות</label>
            <textarea
              rows={3}
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="text-right">
            <label className="block mb-1 font-medium">מסלול</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="sim">חבילת סים</option>
              <option value="wifi">אינטרנט ביתי</option>
              <option value="local">מקומי בלבד</option>
            </select>
          </div>

          <div className="text-right">
            <label className="block mb-1 font-medium">שימור קבצים</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
            >
              <option value={7}>7 ימים</option>
              <option value={14}>14 ימים</option>
            </select>
          </div>

          <div className="text-right">
            <label className="block mb-1 font-medium">מחיר חודשי מותאם (אופציונלי)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded text-right"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="למשל: 100"
            />
          </div>
        </div>

        <button
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "שומר..." : "שמור שינויים"}
        </button>
      </div>
    </main>
  );
}
