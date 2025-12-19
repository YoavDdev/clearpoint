'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ModernNavbar from './ModernNavbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Hide navbar on dashboard, admin, invoices, and auth pages for clean interface
  const hiddenRoutes = [
    '/dashboard', 
    '/admin',
    '/invoice',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/setup-password'
  ];
  const shouldHideNavbar = hiddenRoutes.some(route => pathname.startsWith(route));
  
  // Also hide navbar on home page if user is logged in (welcome banner is shown instead)
  const isHomePage = pathname === '/';
  const isLoggedIn = !!session?.user;
  
  if (shouldHideNavbar || (isHomePage && isLoggedIn)) {
    return null;
  }
  
  return <ModernNavbar />;
}
