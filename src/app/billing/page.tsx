'use client';

export default function BillingPage() {
    const subscription = {
      plan: "Basic Plan",
      price: "₪50/month",
      camerasIncluded: 4,
      storage: "7 Days Recording",
      status: "Active",
    };
  
    return (
      <main className="flex flex-col items-center min-h-screen p-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-8 text-center">
          Your Subscription
        </h1>
  
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{subscription.plan}</h2>
            <p className="text-gray-500">{subscription.price}</p>
          </div>
  
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span>Included Cameras:</span>
              <span>{subscription.camerasIncluded}</span>
            </div>
            <div className="flex justify-between">
              <span>Storage:</span>
              <span>{subscription.storage}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span
                className={`font-semibold ${
                  subscription.status === "Active" ? "text-green-600" : "text-red-500"
                }`}
              >
                {subscription.status}
              </span>
            </div>
          </div>
  
          <button
            className="w-full mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            onClick={() => alert("Please contact support to upgrade your plan.")}
          >
            Upgrade Plan
          </button>
        </div>
      </main>
    );
  }
  