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
      className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-sm font-medium"
      title="מחק מצלמה"
    >
      <Trash2 size={14} />
      <span>מחק</span>
    </button>
  );
}
