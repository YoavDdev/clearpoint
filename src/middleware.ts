import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // 🔐 Protect /dashboard for logged-in users
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 🔐 Protect /admin for users with admin role only
  if (pathname.startsWith("/admin")) {
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 📹 בדיקת גישה למצלמות וצפייה - דורש מנוי פעיל
  const subscriptionRequiredPaths = [
    "/dashboard/",           // דף הבית עם המצלמות
  ];

  // דפים שלא דורשים מנוי (רק התחברות)
  const freeAccessPaths = [
    "/dashboard/subscription",
    "/dashboard/invoices",
    "/dashboard/payments",
    "/dashboard/support",
    "/subscription-expired",
  ];

  // בדוק אם זה נתיב שדורש מנוי
  const requiresSubscription = subscriptionRequiredPaths.some(path => 
    pathname === path || (pathname.startsWith(path) && !freeAccessPaths.some(free => pathname.startsWith(free)))
  );

  if (requiresSubscription && token && token.role !== "admin") {
    // בדוק סטטוס מנוי (קריאה פנימית)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/user/subscription-status`, {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // אם אין גישה, הפנה לדף מנוי פג תוקף
        if (!data.hasAccess) {
          return NextResponse.redirect(new URL("/subscription-expired", request.url));
        }
      }
    } catch (error) {
      console.error("Middleware: Error checking subscription status:", error);
      // במקרה של שגיאה, אפשר גישה (כדי לא לחסום את המערכת)
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
