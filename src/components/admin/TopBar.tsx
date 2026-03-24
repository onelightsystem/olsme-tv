'use client';

import { Menu, LogOut, Sun } from 'lucide-react';
import { Button } from '@components/ui/button';

type TopBarProps = {
  onOpenMenu: () => void;
  onSignOut: () => void;
};

export default function TopBar({ onOpenMenu, onSignOut }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#FFD700]/20 bg-[rgba(8,8,8,0.88)] px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenMenu}
            className="min-h-12 min-w-12 border-white/20 bg-white/[0.04] text-white lg:hidden"
            aria-label="Open admin sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="inline-flex min-h-12 items-center gap-3 rounded-full border border-[#FFD700]/30 bg-black/35 px-4 py-2">
            <span className="rounded-full bg-[#FFD700]/10 p-2 shadow-[0_0_20px_rgba(255,215,0,0.32)]">
              <Sun className="h-4 w-4 text-[#FFD700]" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">olsme.tv</p>
              <p className="text-xs uppercase tracking-[0.12em] text-[#FFE7A0]">Admin Panel</p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onSignOut}
          className="min-h-12 border-white/20 bg-white/[0.04] text-white hover:border-[#FFD700]/35 hover:bg-white/[0.08]"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}