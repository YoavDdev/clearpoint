'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Select = dynamic(() => import('react-select'), { ssr: false });

export default function NewCameraPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userCameras, setUserCameras] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin-get-users');
        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Failed to fetch users:', result.error);
          return;
        }

        setUsers(result.users || []);
      } catch (err) {
        console.error('❌ Unexpected error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  async function handleUserSelect(option: any) {
    setSelectedUser(option);
    if (!option) {
      setUserCameras([]);
      return;
    }

    const res = await fetch('/api/admin-fetch-cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: option.value }),
    });

    const result = await res.json();

    if (!result.success) {
      console.error('Error fetching cameras:', result.error);
    } else {
      setUserCameras(result.cameras);
    }
  }

  async function handleCreateCamera() {
    if (!selectedUser) {
      alert('יש לבחור משתמש קודם');
      return;
    }

    setLoading(true);

    const response = await fetch('/api/admin-create-camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        serialNumber,
        userId: selectedUser.value,
        userEmail: selectedUser.email,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Error creating camera:', result.error);
      alert('יצירת המצלמה נכשלה: ' + result.error);
    } else {
      navigator.clipboard.writeText(result.camera.id);
      alert(`✅ מצלמה נוצרה!
\nה-ID הועתק ללוח:\n${result.camera.id}`);
      setName('');
      setSerialNumber('');
      handleUserSelect(selectedUser); // refresh list
    }

    setLoading(false);
  }

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.full_name ? `${user.full_name} (${user.email})` : user.email,
    email: user.email,
  }));

  return (
    <main className="min-h-screen bg-gray-100 pt-20 px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-right">הוספת מצלמה חדשה</h1>
<Link href="/admin/cameras" className="text-sm text-blue-600 hover:underline block mb-4 text-right">
  ← חזרה לרשימת המצלמות
</Link>

        <div className="mb-6 text-right">
          <label className="block mb-2 font-medium">שייך למשתמש (שם מלא + אימייל)</label>
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={handleUserSelect}
            isSearchable
            placeholder="חפש ובחר משתמש..."
          />
        </div>

        {userCameras.length > 0 && (
          <div className="mb-6 text-right">
            <h2 className="text-lg font-semibold mb-2">מצלמות קיימות של המשתמש:</h2>
            <ul className="list-disc pr-6">
              {userCameras.map((camera) => (
                <li key={camera.id} className="mb-1">
                  {camera.name} (סידורי: {camera.serial_number})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 text-right">
          <label className="block mb-2 font-medium">שם מצלמה</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-6 text-right">
          <label className="block mb-2 font-medium">מספר סידורי</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-right"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>

        <button
          onClick={handleCreateCamera}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
        >
          {loading ? 'יוצר מצלמה...' : 'צור מצלמה'}
        </button>
      </div>
    </main>
  );
}