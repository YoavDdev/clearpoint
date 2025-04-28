'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/cameras', label: 'Cameras' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/support', label: 'Support' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col justify-between fixed">
      {/* Logo */}
      <div className="p-6 font-bold text-xl text-center border-b border-gray-700">
        ClearPoint Admin
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-4 py-2 rounded-lg ${
                  pathname === link.href ? 'bg-gray-700' : 'hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button (Optional) */}
      <div className="p-6 border-t border-gray-700">
        <button className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg">
          Log Out
        </button>
      </div>
    </div>
  );
}
