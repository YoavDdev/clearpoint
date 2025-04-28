'use client';

import { useState } from 'react';

export default function NewCustomerPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [plan, setPlan] = useState('Basic');
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

    // ✅ Send to your backend route
    const response = await fetch('/api/admin-create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        subscription_plan: plan,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Error creating customer:', result.error);
      alert('Error creating customer: ' + result.error);
      setLoading(false);
      return;
    }

    alert('Customer created successfully!');
    setEmail('');
    setFullName('');
    setPlan('Basic');
    setLoading(false);
  };

  return (
    <main className="flex flex-col min-h-screen p-6 ml-64 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Add New Customer</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
        <div className="mb-4">
          <label className="block mb-2">Email</label>
          <input
            type="email"
            className="w-full p-2 border border-gray-300 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">Full Name</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2">Subscription Plan</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
            <option value="VIP">VIP</option>
          </select>
        </div>

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
          onClick={handleCreateCustomer}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Customer'}
        </button>

        {tempPassword && (
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded">
            <p className="text-green-700 font-semibold">Temporary Password:</p>
            <p className="break-words">{tempPassword}</p>
          </div>
        )}
      </div>
    </main>
  );
}
