'use client';

import { usePathname } from 'next/navigation';
import ModernNavbar from './ModernNavbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on dashboard and admin pages for clean surveillance interface
  const hiddenRoutes = ['/dashboard', '/admin'];
  const shouldHideNavbar = hiddenRoutes.some(route => pathname.startsWith(route));
  
  if (shouldHideNavbar) {
    return null;
  }
  
  return <ModernNavbar />;
}
