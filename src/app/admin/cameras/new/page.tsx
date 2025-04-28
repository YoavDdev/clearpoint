'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/libs/supabaseClient';

export default function NewCameraPage() {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase.from('users').select('email');
      if (data) {
        setUsers(data);
      }
    }
    fetchUsers();
  }, []);

  async function handleCreateCamera() {
    setLoading(true);
  
    const response = await fetch('/api/admin-create-camera', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        imageUrl,
        userEmail,
      }),
    });
  
    const result = await response.json();
  
    if (!result.success) {
      console.error('Error creating camera:', result.error);
      alert('Failed to create camera: ' + result.error);
    } else {
      alert('Camera created successfully!');
      setName('');
      setImageUrl('');
      setUserEmail('');
    }
  
    setLoading(false);
  }
  

  return (
    <main className="flex flex-col min-h-screen p-6 ml-64 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Add New Camera</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
        <div className="mb-4">
          <label className="block mb-2">Camera Name</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">Camera Image URL</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2">Assign to User (Email)</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.email} value={user.email}>
                {user.email}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreateCamera}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          {loading ? 'Creating...' : 'Create Camera'}
        </button>
      </div>
    </main>
  );
}
