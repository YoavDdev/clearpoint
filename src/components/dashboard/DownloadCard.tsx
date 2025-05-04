export default function DownloadCard() {
    return (
      <div className="bg-white rounded-2xl shadow p-4 text-right flex-1">
        <div className="font-bold text-md mb-1">⬇️ הורדות</div>
        <div className="text-sm text-gray-600">שימוש באחסון</div>
        <div className="mt-1 bg-gray-200 h-2 rounded-full w-full">
          <div className="bg-green-500 h-2 rounded-full w-2/3" />
        </div>
        <div className="text-xs text-gray-500 mt-1">66% מנוצל</div>
        <a
          href="/downloads"
          className="block mt-2 text-blue-600 text-sm hover:underline"
        >
          צפייה בהיסטוריית הורדות
        </a>
      </div>
    );
  }
  