'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { BarChart3, Bell, Gift, ShieldCheck, Users } from 'lucide-react';
import { auth } from '@lib/firebase/config';
import Sidebar, { type AdminNavKey } from '@components/admin/Sidebar';
import TopBar from '@components/admin/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { useToast } from '@hooks/use-toast';

type DashboardView = {
  key: AdminNavKey;
  title: string;
  description: string;
  highlights: string[];
  href: string;
};

const VIEWS: DashboardView[] = [
  {
    key: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Monitor platform-wide health, pending actions, and growth signals.',
    highlights: ['Live status snapshots', 'Pending queue visibility', 'Quick route shortcuts'],
    href: '/admin',
  },
  {
    key: 'users',
    title: 'All Users',
    description: 'Inspect user growth, search quickly, and review new arrivals from recent signups.',
    highlights: ['Search by name/email/live ID', 'New arrivals filter', '10-row pagination'],
    href: '/admin/users',
  },
  {
    key: 'referrals',
    title: 'Referrals',
    description: 'Track referral performance by referrer and referee while reviewing points credited.',
    highlights: ['Search by referrer/referee', 'Points earned snapshot', 'CSV export placeholder'],
    href: '/admin/referrals',
  },
  {
    key: 'verifications',
    title: 'Verifications',
    description: 'Manage Level 2 and Level 3 verification requests with clear filtering controls.',
    highlights: ['Filter by level', 'Pending-only quick toggle', 'Approve action placeholders'],
    href: '/admin/verifications',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Compose global announcements and review the latest outgoing notification history.',
    highlights: ['Title/message composer', 'Target segment selector', 'Sent timeline list'],
    href: '/admin/notifications',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<AdminNavKey>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentView = useMemo(() => VIEWS.find((view) => view.key === activeView) ?? VIEWS[0], [activeView]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out', description: 'Admin session closed.' });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen">
        <Sidebar
          activeKey={activeView}
          onNavigate={(key) => {
            setActiveView(key);
            setMobileSidebarOpen(false);
          }}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <section className="flex min-h-screen flex-1 flex-col">
          <TopBar onOpenMenu={() => setMobileSidebarOpen(true)} onSignOut={handleSignOut} />

          <div className="space-y-6 p-4 sm:p-6">
            <Card className="rounded-3xl border border-[#FFD700]/25 bg-[rgba(17,17,17,0.8)] backdrop-blur-md">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border border-[#FFD700]/30 bg-[#FFD700]/15 text-[#FFE7A0]">v0.4.1 Admin</Badge>
                  <Badge className="border border-white/20 bg-white/[0.06] text-white">Main Panel</Badge>
                </div>
                <CardTitle className="text-2xl text-white sm:text-3xl">{currentView.title}</CardTitle>
                <CardDescription className="text-gray-300">{currentView.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {currentView.highlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-gray-200">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Users className="h-5 w-5 text-[#FFD700]" />
                    Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">Open the full user index and apply search/new-arrivals filters.</p>
                  <Button
                    type="button"
                    onClick={() => router.push('/admin/users')}
                    className="mt-4 min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
                  >
                    Open Users
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Gift className="h-5 w-5 text-[#FFD700]" />
                    Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">Review referral links, counts, and points credited per conversion.</p>
                  <Button
                    type="button"
                    onClick={() => router.push('/admin/referrals')}
                    className="mt-4 min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
                  >
                    Open Referrals
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <ShieldCheck className="h-5 w-5 text-[#FFD700]" />
                    Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">Filter by verification level and process approval placeholders.</p>
                  <Button
                    type="button"
                    onClick={() => router.push('/admin/verifications')}
                    className="mt-4 min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
                  >
                    Open Verifications
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Bell className="h-5 w-5 text-[#FFD700]" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">Compose announcements and track sent notifications from one place.</p>
                  <Button
                    type="button"
                    onClick={() => router.push('/admin/notifications')}
                    className="mt-4 min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
                  >
                    Open Notifications
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <BarChart3 className="h-5 w-5 text-[#FFD700]" />
                  Selected Tab Preview
                </CardTitle>
                <CardDescription className="text-gray-300">
                  The dashboard content changes with the selected sidebar tab. Use the button below for the complete page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <p className="text-base font-semibold text-[#FFE7A0]">{currentView.title}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-300">{currentView.description}</p>
                  <Button
                    type="button"
                    onClick={() => router.push(currentView.href)}
                    className="mt-4 min-h-12 bg-white/[0.06] text-white hover:bg-white/[0.12]"
                  >
                    Open Full Section
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}