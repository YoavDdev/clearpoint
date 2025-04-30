'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/libs/supabaseClient';

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [plan, setPlan] = useState('Basic');

  useEffect(() => {
    async function fetchCustomer() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !data) {
        alert('שגיאה בטעינת לקוח');
        console.error(error);
        return;
      }

      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setNotes(data.notes || '');
      setPlan(data.subscription_plan || 'Basic');
      setLoading(false);
    }

    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        phone,
        address,
        notes,
        subscription_plan: plan,
      })
      .eq('id', customerId);

    setSaving(false);

    if (error) {
      alert('שגיאה בשמירה: ' + error.message);
      return;
    }

    alert('הלקוח עודכן בהצלחה!');
    router.push(`/admin/customers/${customerId}`);
  };

  if (loading) {
    return <p className="text-center mt-20 text-gray-600">טוען נתונים...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 pt-20 px-6 flex flex-col items-center">
      <div className="w-full max-w-xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-right">עריכת לקוח</h1>

        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">שם מלא</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">טלפון</label>
          <input
            type="tel"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">כתובת</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">הערות</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded text-right"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="mb-6 text-right">
          <label className="block mb-2 font-medium">מסלול</label>
          <select
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
            <option value="VIP">VIP</option>
          </select>
        </div>

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
      </div>
    </main>
  );
}
