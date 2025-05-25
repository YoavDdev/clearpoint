'use client';

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
                        className="text-red-600 hover:underline"
                      >
                        מחיקה
                      </button>
  );
}
