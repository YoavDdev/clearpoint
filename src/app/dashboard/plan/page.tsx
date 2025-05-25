// app/dashboard/plan/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Plan {
  id: string;
  name: string;
  price: number;
  retention_days: number;
  connection: string;
  cloud: boolean;
  live: boolean;
}

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user-plan')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setPlan(result.plan);
          setCustomPrice(result.custom_price);
        } else {
          console.error(result.error);
        }
      });
  }, []);

  if (!plan) return <p className="max-w-xl mx-auto p-6 space-y-6 pt-36">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6 pt-36">
      <h1 className="text-2xl font-bold text-center">התוכנית שלך</h1>

      <div className="bg-white rounded-xl p-6 shadow-md space-y-4 border">
        <h2 className="text-xl font-semibold text-gray-800">📦 תוכנית: {plan.name}</h2>
        <ul className="text-gray-600 list-disc list-inside">
          <li>🕒 גיבוי וידאו: עד {plan.retention_days} ימים</li>
          <li>🌐 חיבור: {plan.connection}</li>
          <li>📡 צפייה חיה מכל מקום: {plan.live ? '✅' : '❌'}</li>
          <li>💾 גיבוי בענן: {plan.cloud ? '✅' : '❌'}</li>
          <li>📥 הורדת קטעים: ✅</li>
        </ul>
        <p>💰 מחיר חודשי: ₪{customPrice ?? plan.price}</p>
        <p>📅 חודש בתוקף עד: 31.05.2025</p>

        {plan.id === 'local' && (
          <Button asChild>
            <a href="#" className="block text-center">
              שדרג לתוכנית ענן
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}