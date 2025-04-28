'use client';

export function DeleteButton({ cameraId }: { cameraId: string }) {
  async function handleDelete() {
    const res = await fetch('/api/admin-delete-camera', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded mt-2"
    >
      Delete
    </button>
  );
}
