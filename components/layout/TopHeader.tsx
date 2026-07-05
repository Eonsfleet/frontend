'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * TopHeader
 *
 * Page-level header used across authenticated views (Trips, Vehicles, Drivers, etc).
 * - `title` / `subtitle` describe the current page
 * - system status pill reflects platform health (poll this from a status endpoint,
 *   don't hardcode "operational")
 * - global search is wired to Cmd+K / Ctrl+K
 * - notifications + user menu are intentionally dumb — pass in the data and
 *   callbacks, this component owns layout/interaction only, not state
 */

export type SystemStatus = 'operational' | 'degraded' | 'down';

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  systemStatus?: SystemStatus;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  userMenu?: React.ReactNode; // dropdown content, rendered when menu is open
}

const STATUS_CONFIG: Record<SystemStatus, { label: string; dotClass: string }> = {
  operational: { label: 'All systems operational', dotClass: 'bg-emerald-500' },
  degraded: { label: 'Degraded performance', dotClass: 'bg-amber-500' },
  down: { label: 'Service disruption', dotClass: 'bg-red-500' },
};

export function TopHeader({
  title,
  subtitle,
  systemStatus = 'operational',
  searchPlaceholder = 'Search trips, vehicles, drivers...',
  onSearch,
  notificationCount = 0,
  onNotificationsClick,
  onProfileClick,
  userMenu,
}: TopHeaderProps) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, clearAuth } = useAuthStore();

  // Cmd+K / Ctrl+K focuses search from anywhere on the page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;
      if (modifierPressed && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const status = STATUS_CONFIG[systemStatus];

  return (
    <header className="flex items-center justify-between borde-b px-6 py-4">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* System status pill */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
          <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
          {status.label}
        </div>

        {/* Global search */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch?.(query);
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-72 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-14 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-400">
            Ctrl K
          </kbd>
        </form>

        {/* Notifications */}
        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
          className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
              onProfileClick?.();
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-gray-100"
          >


            {user?.attributes?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user?.attributes?.avatar ??
                  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                alt={user?.attributes?.full_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                {user?.attributes?.full_name?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}
            <div className="text-left leading-tight">
              <div className="text-sm font-medium text-gray-900">{user?.attributes?.full_name}</div>
              <div className="text-xs text-gray-500">{user?.attributes?.role}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && userMenu && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {userMenu}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopHeader;