import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

export default function NavBar() {
  const location = useLocation();
  const { user } = useUser();

  const links = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/schedule', label: 'Schedule', icon: '📅' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-[#e0dbd0] dark:border-gray-700 flex justify-around py-2 z-50">
      {links.map(({ to, label, icon }) => {
        const active = location.pathname === to || (to === '/schedule' && location.pathname.startsWith('/session'));
        return (
          <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium transition-colors ${active ? 'text-[#3d3420] dark:text-amber-400' : 'text-[#9a9486] dark:text-gray-400'}`}>
            <span className="text-lg">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
