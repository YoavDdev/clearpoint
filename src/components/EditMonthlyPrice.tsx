"use client";

import { useState } from "react";
import { DollarSign, Edit, X, Check } from "lucide-react";

interface EditMonthlyPriceProps {
  userId: string;
  currentPrice: number;
  onPriceUpdated?: () => void;
}

export default function EditMonthlyPrice({ userId, currentPrice, onPriceUpdated }: EditMonthlyPriceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const price = parseFloat(newPrice);
    
    if (isNaN(price) || price < 0) {
      alert("❌ מחיר לא תקין");
      return;
    }

    if (!confirm(`האם לעדכן את המחיר החודשי ל-₪${price}?`)) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-monthly-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPrice: price }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ המחיר עודכן ל-₪${price}`);
        setIsEditing(false);
        if (onPriceUpdated) {
          onPriceUpdated();
        }
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error updating price:", error);
      alert("❌ שגיאה בעדכון מחיר");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setNewPrice(currentPrice.toString());
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
        <DollarSign size={18} className="text-blue-600" />
        <span className="font-bold text-blue-800">₪{currentPrice}</span>
        <span className="text-sm text-blue-600">לחודש</span>
        <button
          onClick={() => setIsEditing(true)}
          className="mr-2 p-1 hover:bg-blue-100 rounded transition-colors"
          title="ערוך מחיר"
        >
          <Edit size={16} className="text-blue-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border-2 border-yellow-300">
      <DollarSign size={18} className="text-yellow-700" />
      <span className="text-yellow-700 font-medium">₪</span>
      <input
        type="number"
        value={newPrice}
        onChange={(e) => setNewPrice(e.target.value)}
        className="w-20 px-2 py-1 border border-yellow-300 rounded text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
        min="0"
        step="1"
        autoFocus
      />
      <span className="text-sm text-yellow-700">לחודש</span>
      
      <div className="flex items-center gap-1 mr-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50"
          title="שמור"
        >
          <Check size={16} />
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
          title="בטל"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
