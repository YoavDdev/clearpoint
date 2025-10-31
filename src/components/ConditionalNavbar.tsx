'use client';

import { usePathname } from 'next/navigation';
import ModernNavbar from './ModernNavbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on dashboard pages for clean surveillance interface
  const hiddenRoutes = ['/dashboard'];
  const shouldHideNavbar = hiddenRoutes.some(route => pathname.startsWith(route));
  
  if (shouldHideNavbar) {
    return null;
  }
  
  return <ModernNavbar />;
}
