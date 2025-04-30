'use client';

import { useState } from 'react';

export default function NewCustomerPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [plan, setPlan] = useState('Basic');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  function generatePassword(length = 8) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  const handleCreateCustomer = async () => {
    setLoading(true);
    const password = generatePassword();
    setTempPassword(password);

    const response = await fetch('/api/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        subscription_plan: plan,
        phone,
        address,
        notes,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      alert('שגיאה ביצירת לקוח: ' + result.error);
      console.error(result.error);
      setLoading(false);
      return;
    }

    alert('✅ הלקוח נוצר בהצלחה!');
    // Reset form
    setEmail('');
    setFullName('');
    setPlan('Basic');
    setPhone('');
    setAddress('');
    setNotes('');
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
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
            <option value="VIP">VIP</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          onClick={handleCreateCustomer}
          disabled={loading}
        >
          {loading ? 'יוצר לקוח...' : 'צור לקוח'}
        </button>

        {/* Temp Password Display */}
        {tempPassword && (
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded text-right">
            <p className="text-green-700 font-semibold mb-1">סיסמה זמנית:</p>
            <p className="break-words">{tempPassword}</p>
          </div>
        )}
      </div>
    </main>
  );
}
