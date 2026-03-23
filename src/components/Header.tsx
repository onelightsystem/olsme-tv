'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sun, Menu, User, LogOut, ExternalLink, Search, Lock } from 'lucide-react';
import { auth, db } from '@lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
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
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isPremium, setIsPremium] = useState(false);
  const [hasSearchAccess, setHasSearchAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    let isMounted = true;
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!isMounted) {
        return;
      }

      setUser(currentUser);
      unsubscribeUserDoc?.();

      if (!currentUser) {
        setIsPremium(false);
        setHasSearchAccess(false);
        return;
      }

      try {
        const tokenResult = await currentUser.getIdTokenResult();
        const claims = tokenResult.claims as Record<string, unknown>;
        const claimTier = typeof claims.subscriptionTier === 'string' ? claims.subscriptionTier : '';
        const claimHasSearchAccess = claims.isPremium === true || ['entry-key', 'tier1', 'tier2'].includes(claimTier);
        const claimIsPremium = claims.isPremium === true || claimTier === 'tier2';

        if (isMounted) {
          setHasSearchAccess(claimHasSearchAccess);
          setIsPremium(claimIsPremium);
        }

        unsubscribeUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), (userDoc) => {
          const data = userDoc.exists() ? (userDoc.data() as Record<string, unknown>) : {};
          const packageName = typeof data.package === 'string' ? data.package : '';
          const subscriptionTier = typeof data.subscriptionTier === 'string' ? data.subscriptionTier : '';
          const docHasSearchAccess =
            data.isPremium === true ||
            data.subscriptionStatus === 'active' ||
            ['entry', 'starter', 'premium'].includes(packageName) ||
            ['entry-key', 'tier1', 'tier2'].includes(subscriptionTier);
          const docIsPremium = data.isPremium === true || packageName === 'premium' || subscriptionTier === 'tier2';

          if (!isMounted) {
            return;
          }

          setHasSearchAccess(claimHasSearchAccess || docHasSearchAccess);
          setIsPremium(claimIsPremium || docIsPremium);
        });
      } catch {
        setIsPremium(false);
        setHasSearchAccess(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeUserDoc?.();
      unsubscribe();
    };
  }, []);

  const profileLabel = useMemo(() => {
    if (!user) return 'Guest';
    return user.displayName || 'Member';
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out', description: 'You are now signed out.' });
  };

  const handleSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedQuery = searchQuery.trim();
    const targetPath = trimmedQuery.length > 0 ? `/search?q=${encodeURIComponent(trimmedQuery)}` : '/search';

    router.push(targetPath);
    setMobileSearchOpen(false);
  };

  const handleLockedSearchClick = () => {
    toast({ title: 'Upgrade to search users', description: 'Search unlocks with an active olsme subscription.' });
    router.push('/subscribe');
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="fixed top-0 z-50 w-full border-b border-[#FFD700]/18 bg-[rgba(8,8,8,0.82)] shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl"
      >
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6">
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

          <div className="hidden min-w-0 items-center justify-center md:flex">
            {!user && (
              <nav className="flex items-center gap-5" aria-label="Primary navigation">
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
            )}

            {user && hasSearchAccess && (
              <form onSubmit={handleSearchSubmit} className="w-full max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search users by name or Live ID..."
                    className="h-12 rounded-full border-white/10 bg-white/[0.04] pl-10 pr-4 text-white placeholder:text-gray-400 focus-visible:ring-[#FFD700]"
                    aria-label="Search users by name or Live ID"
                  />
                </div>
              </form>
            )}

            {user && !hasSearchAccess && (
              <Button
                type="button"
                variant="outline"
                onClick={handleLockedSearchClick}
                title="Upgrade to search users"
                className="min-h-12 rounded-full border-white/15 bg-white/[0.04] px-4 text-gray-300 hover:border-[#FFD700]/35 hover:bg-white/[0.08] hover:text-white"
              >
                <Lock className="mr-2 h-4 w-4 text-[#FFD700]" />
                Upgrade to search users
              </Button>
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-h-12 border-white/20 bg-white/[0.04] px-3 text-white hover:border-[#FFD700]/40 hover:bg-white/[0.08]"
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
                  <DropdownMenuItem asChild>
                    <Link href="/dev-log">Developer Log</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://olsme.com/contact" target="_blank" rel="noreferrer">Contact Us</a>
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
                  className="min-h-12 border-white/35 bg-white/[0.04] px-4 text-white hover:border-white hover:bg-white/[0.08]"
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

          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={hasSearchAccess ? () => setMobileSearchOpen(true) : handleLockedSearchClick}
                title={hasSearchAccess ? 'Search users' : 'Upgrade to search users'}
                className="min-h-12 min-w-12 border-white/25 bg-black/20 text-white"
              >
                {hasSearchAccess ? <Search className="h-5 w-5 text-[#FFD700]" /> : <Lock className="h-5 w-5 text-[#FFD700]" />}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="min-h-12 min-w-12 border-white/25 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                  {user ? <User className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#101010] text-white">
                {user ? (
                  <>
                    <DropdownMenuLabel>{profileLabel}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/about">About</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dev-log">Developer Log</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="https://olsme.com/contact" target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Contact Us
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {navItems.map((item) => (
                      <DropdownMenuItem asChild key={item.href}>
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
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

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="left-0 top-0 h-screen max-w-none translate-x-0 translate-y-0 rounded-none border-x-0 border-t-0 border-white/10 bg-[#050505]/96 p-6 text-white sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
          <DialogHeader>
            <DialogTitle>Search Users</DialogTitle>
            <DialogDescription className="text-gray-300">
              Search by name or Live ID across the mindful community.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearchSubmit} className="mt-2 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users by name or Live ID..."
                className="h-12 rounded-full border-white/10 bg-black/40 pl-10 pr-4 text-white placeholder:text-gray-400 focus-visible:ring-[#FFD700]"
                aria-label="Mobile search users by name or Live ID"
              />
            </div>

            <Button type="submit" className="min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]">
              Search
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialTab={authInitialTab} />
    </>
  );
}