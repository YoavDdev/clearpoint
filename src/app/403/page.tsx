export default function AccessDeniedPage() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 text-center pt-16">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-red-600 mb-4">403 – אין גישה</h1>
          <p className="text-gray-700 mb-6">
            אין לך הרשאות לצפות בדף זה. אם אתה חושב שזה טעות, אנא פנה למנהל.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            חזרה ללוח הבקרה
          </a>
        </div>
      </div>
    );
  }
  