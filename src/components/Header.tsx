'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sun, Menu, User, LogOut } from 'lucide-react';
import { auth, db } from '@lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import AuthModal from '@components/auth/auth-modal';
import { useToast } from '@hooks/use-toast';

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/dev-log', label: 'Developer Log' },
];

export default function Header() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isPremium, setIsPremium] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsPremium(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
    });

    return () => unsubscribe();
  }, []);

  const profileLabel = useMemo(() => {
    if (!user) return 'Guest';
    return user.displayName || 'Member';
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out', description: 'You are now signed out.' });
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-[#FFD700]/25 bg-black/35 px-4 py-2 transition hover:scale-[1.03] hover:shadow-[0_0_26px_rgba(255,215,0,0.38)]"
            aria-label="Go to homepage"
          >
            <span className="rounded-full bg-[#FFD700]/10 p-2 shadow-[0_0_24px_rgba(255,215,0,0.35)]">
              <Sun className="h-5 w-5 text-[#FFD700]" aria-hidden="true" />
            </span>
            <span className="text-base font-bold text-white [text-shadow:0_0_14px_rgba(255,215,0,0.28)]">
              olsme.tv
            </span>
          </Link>

          <nav className="hidden items-center gap-5 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex min-h-12 items-center px-2 text-sm font-medium transition ${
                    isActive ? 'text-[#FFE08A]' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && <span className="absolute bottom-2 left-2 right-2 h-0.5 rounded-full bg-[#FFD700] shadow-[0_0_14px_rgba(255,215,0,0.55)]" />}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-h-12 border-white/20 bg-black/20 px-3 text-white hover:border-[#FFD700]/40 hover:bg-black/35"
                    aria-label="Open account menu"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {profileLabel}
                    {isPremium && (
                      <Badge className="ml-2 border-[#FFD700]/40 bg-[#FFD700]/15 text-[#FFE7A0]">
                        Premium
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#101010] text-white">
                  <DropdownMenuLabel>{profileLabel}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/about">About</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="min-h-12 border-white/35 bg-black/15 px-4 text-white hover:border-white hover:bg-white/5"
                  onClick={() => {
                    setAuthInitialTab('signin');
                    setAuthOpen(true);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  className="min-h-12 bg-gradient-to-r from-[#FFD700] to-[#FFAA00] px-4 text-black shadow-[0_0_20px_rgba(255,186,73,0.35)] transition hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(255,186,73,0.5)]"
                  onClick={() => {
                    setAuthInitialTab('signup');
                    setAuthOpen(true);
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="min-h-12 min-w-12 border-white/25 bg-black/20 text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#101010] text-white">
                {navItems.map((item) => (
                  <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {user ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setAuthInitialTab('signin');
                        setAuthOpen(true);
                      }}
                    >
                      Sign In
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setAuthInitialTab('signup');
                        setAuthOpen(true);
                      }}
                    >
                      Sign Up
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialTab={authInitialTab} />
    </>
  );
}