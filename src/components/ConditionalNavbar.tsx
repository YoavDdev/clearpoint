'use client';

import { usePathname } from 'next/navigation';
import ModernNavbar from './ModernNavbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on dashboard, admin, and auth pages for clean interface
  const hiddenRoutes = [
    '/dashboard', 
    '/admin',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/setup-password'
  ];
  const shouldHideNavbar = hiddenRoutes.some(route => pathname.startsWith(route));
  
  if (shouldHideNavbar) {
    return null;
  }
  
  return <ModernNavbar />;
}
