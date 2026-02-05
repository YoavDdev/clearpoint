'use client';

import { Trash2 } from 'lucide-react';

type DeleteButtonProps = {
  cameraId: string;
};

export function DeleteButton({ cameraId }: DeleteButtonProps) {
  async function handleDelete() {
    const res = await fetch('/api/admin-delete-camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId }),
    });

    const result = await res.json();

    if (!result.success) {
      alert('Error deleting camera: ' + result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
      title="מחק מצלמה"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
