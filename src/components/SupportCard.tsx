// components/SupportCard.tsx
export default function SupportCard() {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 max-w-3xl w-full mx-auto text-right">
        <h2 className="text-xl font-bold text-gray-800 mb-2">🆘 תמיכה</h2>
  
        <p className="text-gray-600 mb-4">
          צריך עזרה? כאן תוכל לפנות לתמיכה טכנית, לשאול שאלה, או להשתמש בעוזר חכם (בקרוב).
        </p>
  
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl text-sm transition"
            onClick={() => alert("כאן תהיה התממשקות עם AI בהמשך")}
          >
            🤖 עוזר חכם (בקרוב)
          </button>
  
          <button
            className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-2 rounded-xl text-sm transition"
            onClick={() => alert("טופס יצירת קשר / פתיחת קריאה")}
          >
            📩 יצירת קשר
          </button>
        </div>
      </div>
    );
  }
  