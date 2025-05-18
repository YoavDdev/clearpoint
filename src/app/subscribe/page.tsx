"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Supabase client setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SubscribeFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); // ✅ new
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan) {
      const hebrewName =
        plan === "sim"
          ? "חבילת סים"
          : plan === "wifi"
          ? "חבילת אינטרנט ביתי"
          : "חבילת מקומית";
      setSelectedPlan(hebrewName);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("subscription_requests").insert({
      full_name: fullName,
      email, // ✅ added
      phone,
      address,
      preferred_date: preferredDate,
      selected_plan: selectedPlan,
    });

    setSubmitting(false);

    if (!error) {
      router.push("/thanks");
    } else {
      alert("אירעה שגיאה. נסה שוב.");
    }
  };

  return (
    <div dir="rtl" className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">
        טופס בקשה לחבילת {selectedPlan}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">שם מלא</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">אימייל</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">טלפון</label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">כתובת</label>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">תאריך מועדף להתקנה</label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">החבילה שנבחרה</label>
          <input
            disabled
            value={selectedPlan}
            className="w-full border p-2 rounded bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          שלח בקשה
        </button>
      </form>
    </div>
  );
}
