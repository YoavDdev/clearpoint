// components/PlanCard.tsx
export default function PlanCard() {
    const currentPlan = "בסיסי";
    const daysBackAllowed = 0;
  
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 max-w-3xl w-full mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2 text-right">📦 התוכנית שלך: {currentPlan}</h2>
  
        <p className="text-gray-600 mb-4 text-right">
          {daysBackAllowed > 0
            ? `ניתן לצפות בהקלטות עד ${daysBackAllowed} ימים אחורה.`
            : "תוכנית זו מאפשרת צפייה בשידור חי בלבד."}
        </p>
  
        <div className="text-right">
          <button
            className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl text-sm transition"
            onClick={() => alert("שדרוג יתבצע כאן בהמשך")}
          >
            🔼 שדרוג תוכנית
          </button>
        </div>
      </div>
    );
  }
  