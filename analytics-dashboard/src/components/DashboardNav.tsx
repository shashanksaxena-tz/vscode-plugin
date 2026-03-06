"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavProps {
  userRole: 'developer' | 'manager' | 'admin';
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Overview", roles: ['developer', 'manager', 'admin'] },
    { href: "/dashboard/team", label: "Team", roles: ['manager', 'admin'] },
    { href: "/dashboard/cohorts", label: "Cohorts", roles: ['manager', 'admin'] },
    { href: "/dashboard/admin", label: "Admin", roles: ['admin'] },
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-blue-600">Copilot Analytics</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => {
                 if (!link.roles.includes(userRole)) return null;
                 // Active if pathname matches exactly or starts with href/ (except root /dashboard)
                 const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));

                 return (
                   <Link
                     key={link.href}
                     href={link.href}
                     className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                       isActive
                         ? "border-blue-500 text-gray-900"
                         : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                     }`}
                   >
                     {link.label}
                   </Link>
                 );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
