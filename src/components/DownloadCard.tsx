// components/DownloadCard.tsx
export default function DownloadCard() {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 max-w-3xl w-full mx-auto text-right">
        <h2 className="text-xl font-bold text-gray-800 mb-2">🎥 שמירה והורדה</h2>
  
        <p className="text-gray-600 mb-4">
          כאן תוכל להוריד קטעים מוקלטים או לבקש שמירה של וידאו. בקרוב נוסיף אפשרות לגישה לפי תאריך ותוכנית המנוי שלך.
        </p>
  
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl text-sm transition"
            onClick={() => alert("כאן תהיה אפשרות להורדה מקומית או שמירת קליפ")}
          >
            ⬇️ הורדת קטע
          </button>
  
          <button
            className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-2 rounded-xl text-sm transition"
            onClick={() => alert("כאן תוכל לבקש גישה להקלטה מתאריך מסוים")}
          >
            📅 בקשת הקלטה לפי תאריך
          </button>
        </div>
      </div>
    );
  }
  