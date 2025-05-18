import Link from "next/link";

export default function PlanCardsGrid() {
  return (
    <div dir="rtl" className="max-w-7xl mx-auto p-4 space-y-12">
      {/* Title Section */}
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">בחר את החבילה שמתאימה לך</h1>
        <p className="text-gray-600">כל החבילות כוללות 4 מצלמות, הקלטה 24/7, ודשבורד בעברית בגישה מאובטחת.</p>
      </header>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SIM Plan */}
        <div className="rounded-2xl border p-6 space-y-4 shadow-md bg-orange-50">
          <h2 className="text-xl font-bold text-orange-600 text-center">🔶 חבילת סים</h2>
          <p className="text-center text-2xl font-semibold text-gray-800">₪69 לחודש</p>
          <ul className="text-sm space-y-1 text-right text-gray-700">
            <li>✅ חיבור דרך ראוטר SIM</li>
            <li>✅ גיבוי חכם או לפי דרישה</li>
            <li>✅ צפייה חיה מרחוק</li>
            <li>✅ שמירה עד 7 ימים</li>
            <li>✅ אפשרות לקליפים ותמונות</li>
          </ul>
          <Link href="/subscribe?plan=sim" className="block w-full text-center bg-orange-500 text-white rounded-lg py-2 hover:bg-orange-600">
            בחר חבילה זו
          </Link>
        </div>

        {/* Home Wi-Fi Plan */}
        <div className="rounded-2xl border p-6 space-y-4 shadow-lg bg-blue-50 scale-105">
          <h2 className="text-xl font-bold text-blue-600 text-center">🔷 חבילת אינטרנט ביתי</h2>
          <p className="text-center text-2xl font-semibold text-gray-800">₪79 לחודש</p>
          <ul className="text-sm space-y-1 text-right text-gray-700">
            <li>✅ חיבור Wi-Fi ביתי</li>
            <li>✅ העלאה אוטומטית לענן</li>
            <li>✅ צפייה חיה מרחוק</li>
            <li>✅ שמירה עד 14 ימים</li>
            <li>✅ הורדת קליפים ותמונות</li>
          </ul>
          <Link href="/subscribe?plan=wifi" className="block w-full text-center bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">
            בחר חבילה זו
          </Link>
        </div>

        {/* Local Plan */}
        <div className="rounded-2xl border p-6 space-y-4 shadow-md bg-stone-100">
          <h2 className="text-xl font-bold text-stone-700 text-center">🟤 חבילת מקומית</h2>
          <p className="text-center text-2xl font-semibold text-gray-800">₪59 לחודש</p>
          <ul className="text-sm space-y-1 text-right text-gray-700">
            <li>❌ אין חיבור לאינטרנט</li>
            <li>✅ אחסון מקומי בלבד</li>
            <li>✅ שמירה עד 14 ימים (SSD)</li>
            <li>✅ קליפים ותמונות – בגישה מקומית</li>
            <li>✅ מתאימה לשומרי פרטיות</li>
          </ul>
          <Link href="/subscribe?plan=local" className="block w-full text-center bg-stone-700 text-white rounded-lg py-2 hover:bg-stone-800">
            בחר חבילה זו
          </Link>
        </div>
      </div>

      {/* Shared Features */}
      <div className="border-t pt-6 text-center space-y-2">
        <h3 className="font-semibold">כל החבילות כוללות:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✅ GMKtec Mini PC מותקן מראש</li>
          <li>✅ התקנת מצלמות PoE מלאה</li>
          <li>✅ דשבורד מאובטח ונוח בעברית</li>
          <li>✅ הקלטה 24/7 ושמירה לפי תוכנית</li>
          <li>✅ אפשרות לצפייה חיה וייצוא תמונות</li>
        </ul>
      </div>
    </div>
  );
}