'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { LayoutDashboard, Users, Gift, ShieldCheck, Bell, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';

export type AdminNavKey = 'dashboard' | 'users' | 'referrals' | 'verifications' | 'notifications';

export type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SidebarProps = {
  activeKey: AdminNavKey;
  onNavigate?: (key: AdminNavKey) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'users', label: 'All Users', href: '/admin/users', icon: Users },
  { key: 'referrals', label: 'Referrals', href: '/admin/referrals', icon: Gift },
  { key: 'verifications', label: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
  { key: 'notifications', label: 'Notifications', href: '/admin/notifications', icon: Bell },
];

export default function Sidebar({ activeKey, onNavigate, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const items = useMemo(() => ADMIN_NAV_ITEMS, []);

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[rgba(8,8,8,0.86)] p-4 backdrop-blur-xl lg:block">
        <nav className="space-y-2" aria-label="Admin sidebar navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={(event) => {
                  if (!onNavigate) return;
                  event.preventDefault();
                  onNavigate(item.key);
                }}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                  isActive
                    ? 'border-[#FFD700]/35 bg-[#FFD700]/15 text-[#FFE7A0] shadow-[0_0_20px_rgba(255,215,0,0.15)]'
                    : 'border-white/10 bg-white/[0.02] text-white/85 hover:border-[#FFD700]/30 hover:bg-white/[0.05]'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/60"
            aria-label="Close admin sidebar"
          />
          <aside className="relative z-[71] h-full w-72 border-r border-white/10 bg-[rgba(8,8,8,0.92)] p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FFE7A0]">Admin Menu</p>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={onCloseMobile}
                className="min-h-12 min-w-12 border-white/20 bg-white/[0.04] text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-2" aria-label="Admin mobile sidebar navigation">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeKey === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={(event) => {
                      onCloseMobile?.();
                      if (!onNavigate) return;
                      event.preventDefault();
                      onNavigate(item.key);
                    }}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'border-[#FFD700]/35 bg-[#FFD700]/15 text-[#FFE7A0] shadow-[0_0_20px_rgba(255,215,0,0.15)]'
                        : 'border-white/10 bg-white/[0.02] text-white/85 hover:border-[#FFD700]/30 hover:bg-white/[0.05]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}