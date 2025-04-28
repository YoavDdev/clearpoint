'use client';

export default function SupportPage() {
  return (
    <main className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-center">
        Need Help?
      </h1>

      <p className="text-gray-600 text-center max-w-md mb-8">
        If you need any assistance with your cameras, subscription, or have any other question, 
        our team is here to help. Feel free to reach out!
      </p>

      <a
        href="mailto:support@clearpointsecurity.com"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
      >
        📧 Contact Customer Support
      </a>
    </main>
  );
}
