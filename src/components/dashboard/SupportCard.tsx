export default function SupportCard() {
    return (
      <div className="bg-white rounded-2xl shadow p-4 text-right flex-1">
        <div className="font-bold text-md mb-1">🆘 תמיכה</div>
        <div className="text-sm text-gray-600 mb-4">זקוק לעזרה?</div>
        <a
          href="/support"
          className="text-blue-600 text-sm hover:underline"
        >
          מעבר למרכז התמיכה
        </a>
      </div>
    );
  }
  