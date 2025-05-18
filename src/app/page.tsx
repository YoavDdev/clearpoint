import PlanCardsGrid from "@/components/PlanCardsGrid";

export default function HomePage() {
  return (
    <main dir="rtl" className="flex flex-col items-center justify-start min-h-screen px-4 py-12 space-y-12 bg-gray-50 pt-28">
      {/* Hero Title */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">ברוכים הבאים ל-Clearpoint</h1>
        <p className="text-lg text-gray-600">
          פתרון המעקב החכם והמאובטח לבית ולעסק – בחר את התוכנית שמתאימה לך 👇
        </p>
      </section>

      {/* Plan Cards */}
      <section className="w-full max-w-7xl">
        <PlanCardsGrid />
      </section>
    </main>
  );
}
