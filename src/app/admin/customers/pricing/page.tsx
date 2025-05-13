"use client";

import { useState } from "react";

export default function PricingSimulator() {
  const [plan, setPlan] = useState("Basic");
  const [extraCameras, setExtraCameras] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPrice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calculate-price?plan=${plan}&extraCameras=${extraCameras}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Error fetching price", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">סימולטור תמחור</h1>

      <div className="mb-4">
        <label className="block font-semibold">בחר תוכנית:</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="Basic">Basic (מצלמה אחת)</option>
          <option value="Standard">Standard (2 מצלמות)</option>
          <option value="Pro">Pro (3 מצלמות)</option>
          <option value="ProPlus">Pro + 1 Extra (4 מצלמות)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-semibold">מצלמות נוספות:</label>
        <input
          type="number"
          value={extraCameras}
          onChange={(e) => setExtraCameras(Number(e.target.value))}
          className="w-full p-2 border rounded"
          min={0}
        />
      </div>

      <button
        onClick={fetchPrice}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "מחשב..." : "חשב מחיר"}
      </button>

      {result && !result.error && (
        <div className="mt-6 border-t pt-4 space-y-2 text-right">
          <p><strong>תוכנית:</strong> {result.plan}</p>
          <p><strong>מחיר בסיסי:</strong> ₪{result.basePrice}</p>
          <p><strong>מצלמות נוספות:</strong> {result.extraCameras}</p>
          <p><strong>תשלום חודשי:</strong> ₪{result.monthlyPrice}</p>
          <p><strong>תשלום חד פעמי:</strong> ₪{result.oneTimeFee}</p>
          <p className="text-green-600"><strong>רווח חודשי:</strong> ₪{result.profit}</p>
        </div>
      )}

      {result?.error && (
        <p className="mt-4 text-red-600">שגיאה: {result.error}</p>
      )}
    </div>
  );
}
