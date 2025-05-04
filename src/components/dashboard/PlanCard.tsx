export default function PlanCard() {
    return (
      <div className="bg-white rounded-2xl shadow p-4 text-right flex-1">
        <div className="font-bold text-md mb-1">📦 התוכנית שלך</div>
        <div className="text-sm text-gray-600 mb-2">תוכנית: בסיסית</div>
        <div className="text-xs text-gray-500 mb-4">מסתיים בעוד 12 ימים</div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded">
          שדרג תוכנית
        </button>
      </div>
    );
  }
  