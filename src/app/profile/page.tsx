'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth, db, requestKYCVerification } from '@lib/firebase/config';
import { User as FirebaseUser, sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@components/ui/card';
import { Progress } from '@components/ui/progress';
import { Skeleton } from '@components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { useToast } from '@hooks/use-toast';
import {
  Award,
  CheckCircle2,
  Circle,
  Copy,
  Gem,
  Gift,
  HandCoins,
  IdCard,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { formatPolitenessScore } from '@lib/utils';

type VerificationLevel = 'level1' | 'level2' | 'level3';

type UserProfile = {
  uid: string;
  displayName?: string;
  email?: string;
  decentralizedId?: string;
  package?: 'free' | 'entry' | 'starter' | 'premium';
  subscriptionTier?: 'entry-key' | 'tier1' | 'tier2';
  subscriptionStatus?: string;
  verificationLevel?: VerificationLevel;
  politenessScore?: {
    ethical?: number;
    communication?: number;
    listener?: number;
    topics?: number;
  };
  olsPoints?: number;
  location?: string;
  country?: string;
  photoURL?: string;
  socialLinks?: string[];
  referralCode?: string;
  referralPoints?: number;
  earningsUsd?: number;
};

type ActivityLog = {
  id: string;
  action: string;
  context: string;
  timestamp?: unknown;
};

type RawActivityLog = {
  id: string;
  userId?: unknown;
  action?: unknown;
  context?: unknown;
  timestamp?: unknown;
};

const verificationLevelText: Record<VerificationLevel, string> = {
  level1: 'Level 1: Unverified',
  level2: 'Level 2: Video Verified',
  level3: 'Level 3: KYC Verified',
};

const scoreKeys = [
  { key: 'ethical', label: 'Ethical' },
  { key: 'communication', label: 'Communication' },
  { key: 'listener', label: 'Listener' },
  { key: 'topics', label: 'Topics' },
] as const;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function formatLogTime(value: unknown): string {
  if (!value) return 'Just now';

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }

  return 'Just now';
}

function packageLabel(profile: UserProfile): 'Free' | 'Entry Key' | 'Starter' | 'Premium' {
  if (profile.package === 'premium' || profile.subscriptionTier === 'tier2') return 'Premium';
  if (profile.package === 'starter' || profile.subscriptionTier === 'tier1') return 'Starter';
  if (profile.package === 'entry' || profile.subscriptionTier === 'entry-key') return 'Entry Key';
  return 'Free';
}

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [isRequestingKYC, setIsRequestingKYC] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const { logToIPFS } = await import('@lib/ipfs-client');
        await logToIPFS({ userId: currentUser.uid, action: 'profile_view' });
      }

      if (!currentUser) {
        setProfile(null);
        setActivity([]);
        setLoading(false);
        setLogsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find user profile.' });
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching profile:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load profile.' });
        setLoading(false);
      }
    );

    return () => unsubscribeSnapshot();
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, 'logs');
    const recentLogsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribeLogs = onSnapshot(
      recentLogsQuery,
      (snap) => {
        const nextLogs = snap.docs
          .map((logDoc) => ({ id: logDoc.id, ...(logDoc.data() as Record<string, unknown>) }) as RawActivityLog)
          .filter((item) => item.userId === user.uid)
          .slice(0, 5)
          .map((item) => ({
            id: item.id,
            action: typeof item.action === 'string' ? item.action : 'profile_action',
            context: typeof item.context === 'string' ? item.context : 'profile',
            timestamp: item.timestamp,
          }));

        setActivity(nextLogs);
        setLogsLoading(false);
      },
      () => {
        setActivity([]);
        setLogsLoading(false);
      }
    );

    return () => unsubscribeLogs();
  }, [user]);

  const handleRequestKYC = async () => {
    if (!user) return;

    setIsRequestingKYC(true);
    try {
      await requestKYCVerification(user.uid);
      toast({
        title: 'Request sent',
        description: 'Your KYC verification request has been sent to admin review.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: (error as Error).message || 'An unknown error occurred.',
      });
    } finally {
      setIsRequestingKYC(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!user) return;

    const nextEmail = window.prompt('Enter your new email address:');
    if (!nextEmail) return;

    try {
      await verifyBeforeUpdateEmail(user, nextEmail.trim());
      toast({
        title: 'Verification sent',
        description: 'Please confirm the email change from your inbox.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Email update failed',
        description: (error as Error).message || 'Please try again.',
      });
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({ variant: 'destructive', title: 'Password update failed', description: 'No email found for this account.' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'Reset email sent',
        description: 'Check your inbox to set a new password.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Password update failed',
        description: (error as Error).message || 'Please try again.',
      });
    }
  };

  const handleCopyReferralLink = async () => {
    if (!user) return;

    const referralLink = `https://studio-4615914296-4bd91.web.app/?ref=${user.uid}`;

    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: 'Referral link copied',
        description: 'Your referral link is ready to share.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Clipboard access is unavailable right now.',
      });
    }
  };

  const handleHoldAccount = () => {
    setHoldDialogOpen(false);
    toast({
      title: 'Hold status placeholder',
      description: 'Account hold UI is ready. Backend activation will be added later.',
    });
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    toast({
      title: 'Delete placeholder',
      description: 'Delete account UI is ready. Permanent deletion is not connected yet.',
    });
  };

  const isPremium = useMemo(() => {
    if (!profile) return false;
    return (
      profile.package === 'premium' ||
      profile.subscriptionTier === 'tier2' ||
      profile.subscriptionStatus === 'active'
    );
  }, [profile]);

  const currentLevel: VerificationLevel = profile?.verificationLevel ?? 'level1';
  const displayName = profile?.displayName || user?.displayName || 'Awakener';
  const safeEmail = profile?.email || user?.email || 'No email saved';
  const liveId = profile?.decentralizedId || user?.uid || 'No Live ID yet';

  const politeness = {
    ethical: profile?.politenessScore?.ethical ?? 0,
    communication: profile?.politenessScore?.communication ?? 0,
    listener: profile?.politenessScore?.listener ?? 0,
    topics: profile?.politenessScore?.topics ?? 0,
  };

  const { average, badge, message } = formatPolitenessScore(politeness);

  const level2Requirements = [
    {
      label: 'Real name visible to others',
      met: Boolean((profile?.displayName || '').trim()),
    },
    {
      label: 'Country location added',
      met: Boolean((profile?.country || profile?.location || '').trim()),
    },
    {
      label: 'Profile image uploaded',
      met: Boolean((profile?.photoURL || '').trim()),
    },
    {
      label: 'Social media links added',
      met: Array.isArray(profile?.socialLinks) && profile!.socialLinks!.length > 0,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <Skeleton className="h-28 w-full rounded-3xl bg-white/10" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 rounded-3xl bg-white/10" />
            <Skeleton className="h-56 rounded-3xl bg-white/10" />
          </div>
          <Skeleton className="h-64 rounded-3xl bg-white/10" />
        </div>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] px-4 py-16 text-white sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#111111]/75 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold">Please sign in to view your profile.</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] px-4 pb-14 pt-8 text-white sm:px-6 sm:pt-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(255,215,0,0.08), transparent 42%), radial-gradient(circle at 82% 72%, rgba(255,170,0,0.06), transparent 45%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-5">
        {!isPremium && (
          <div className="rounded-2xl border border-[#FFD700]/30 bg-[rgba(17,17,17,0.82)] p-4 text-[#FFE7A0] backdrop-blur-md">
            <p className="text-sm font-semibold">Upgrade to unlock unlimited mindful chats.</p>
            <Link href="/subscribe" className="mt-2 inline-block text-sm font-bold text-[#FFD700] underline-offset-4 hover:underline">
              Go to Subscribe
            </Link>
          </div>
        )}

        <Card className="rounded-3xl border border-white/10 bg-[rgba(17,17,17,0.82)] shadow-[0_20px_65px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border border-[#FFD700]/35 shadow-[0_0_28px_rgba(255,215,0,0.18)]">
                  <AvatarImage src={profile.photoURL || ''} alt={displayName} />
                  <AvatarFallback className="bg-[#1A1A1A] text-[#FFD700]">
                    <UserRound className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">{displayName}</h1>
                  <p className="mt-1 text-sm text-gray-300">{maskEmail(safeEmail)}</p>
                  <p className="mt-1 text-sm text-[#FFD700]">Live ID: {liveId}</p>
                </div>
              </div>

              <Badge className="w-fit border border-[#FFD700]/35 bg-[#FFD700]/15 px-3 py-1 text-[#FFE7A0]">
                v0.4.1 Profile
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Gem className="h-5 w-5 text-[#FFD700]" />
                Package
              </CardTitle>
              <CardDescription className="text-gray-300">Current access and package controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-gray-300">Current package</p>
                <p className="mt-1 text-2xl font-bold text-[#FFD700]">{packageLabel(profile)}</p>
              </div>
              <Button asChild className="min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F] hover:shadow-[0_0_18px_rgba(255,215,0,0.38)]">
                <Link href="/subscribe">Upgrade / Switch Package</Link>
              </Button>
            </CardContent>
          </Card>

          <Card id="verification" className="scroll-mt-28 rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-5 w-5 text-[#FFD700]" />
                Verification
              </CardTitle>
              <CardDescription className="text-gray-300">Become fully verified to unlock all benefits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className="border border-[#FFD700]/30 bg-[#FFD700]/15 text-[#FFE7A0]">
                {verificationLevelText[currentLevel]}
              </Badge>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/90">
                  {currentLevel === 'level1' ? <CheckCircle2 className="h-4 w-4 text-[#FFD700]" /> : <Circle className="h-4 w-4 text-white/50" />}
                  Level 1: Unverified
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  {currentLevel === 'level2' || currentLevel === 'level3' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#FFD700]" />
                  ) : (
                    <Circle className="h-4 w-4 text-white/50" />
                  )}
                  Level 2: Video Verified
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  {currentLevel === 'level3' ? <CheckCircle2 className="h-4 w-4 text-[#FFD700]" /> : <Circle className="h-4 w-4 text-white/50" />}
                  Level 3: KYC Verified
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="mb-2 text-sm font-semibold text-[#FFE7A0]">Level 2 requirements</p>
                <ul className="space-y-1 text-sm text-gray-300">
                  {level2Requirements.map((item) => (
                    <li key={item.label} className="flex items-center gap-2">
                      {item.met ? <CheckCircle2 className="h-4 w-4 text-[#FFD700]" /> : <Circle className="h-4 w-4 text-gray-500" />}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                onClick={handleRequestKYC}
                disabled={isRequestingKYC || currentLevel !== 'level2'}
                className="min-h-12 w-full"
              >
                {isRequestingKYC ? 'Requesting...' : 'Request Level 3 (KYC) Verification'}
              </Button>
              {currentLevel !== 'level2' && (
                <p className="text-center text-xs text-gray-400">
                  Level 3 request unlocks after Level 2 (Video Verified).
                </p>
              )}
            </CardFooter>
          </Card>
        </div>

        <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-[#FFD700]" />
              Politeness Score
            </CardTitle>
            <CardDescription className="text-gray-300">Mindful communication quality snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
              <p className="text-sm text-gray-300">Current score</p>
              <p className="mt-2 text-5xl font-bold text-[#FFD700]">{average}<span className="text-base font-medium text-gray-300">/100</span></p>
              <p className="mt-1 text-sm text-gray-300">{badge}: {message}</p>
              <Progress value={average} className="mt-4 h-2 bg-white/10" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scoreKeys.map((item) => {
                const value = politeness[item.key] ?? 0;
                return (
                  <div key={item.key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-gray-400">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{value}</p>
                    <Progress value={value} className="mt-2 h-1.5 bg-white/10" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gift className="h-5 w-5 text-[#FFD700]" />
              Referral Program
            </CardTitle>
            <CardDescription className="text-gray-300">
              Invite friends to olsme.tv and earn OLS Points. 1 paid referral = 50 points (~$0.05), 10 points = $0.01. Points convert to cash or premium time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-gray-300">Current referral points balance</p>
              <p className="mt-1 text-3xl font-bold text-[#FFD700]">{profile.referralPoints ?? 0}</p>
            </div>
            <Button
              type="button"
              onClick={handleCopyReferralLink}
              className="min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F] hover:shadow-[0_0_18px_rgba(255,215,0,0.38)]"
            >
              <Copy className="mr-2 h-4 w-4" />
              Get Your Referral Link
            </Button>
            <p className="text-xs text-gray-400">
              Share your link — first 5 successful referrals get bonus 100 points.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <KeyRound className="h-5 w-5 text-[#FFD700]" />
              Settings
            </CardTitle>
            <CardDescription className="text-gray-300">Manage your account credentials</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={handleChangeEmail} className="min-h-12 border-white/20 bg-black/20 text-white hover:bg-black/35">
              <Mail className="mr-2 h-4 w-4" />
              Change Email
            </Button>
            <Button type="button" variant="outline" onClick={handleChangePassword} className="min-h-12 border-white/20 bg-black/20 text-white hover:bg-black/35">
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <Button type="button" variant="outline" onClick={() => setHoldDialogOpen(true)} className="min-h-12 border-white/20 bg-black/20 text-white hover:bg-black/35">
              Hold Account Status (up to 30 days)
            </Button>
            <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="min-h-12">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {!isPremium ? (
          <Card className="rounded-3xl border border-[#FFD700]/30 bg-[rgba(17,17,17,0.82)] backdrop-blur-md">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-[#FFE7A0]">Premium insights are locked</p>
                <p className="text-sm text-gray-300">Upgrade to unlock Earnings, Activity Logs, and Referral Program tools.</p>
              </div>
              <Button asChild className="min-h-12 bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]">
                <Link href="/subscribe">Upgrade to Premium</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Wallet className="h-5 w-5 text-[#FFD700]" />
                  Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#FFD700]">{(profile.earningsUsd ?? 0).toFixed(2)} USD</p>
                <p className="mt-2 text-sm text-gray-300">earned from Host TV</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <IdCard className="h-5 w-5 text-[#FFD700]" />
                  Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {logsLoading && <p className="text-sm text-gray-400">Loading activity...</p>}
                {!logsLoading && activity.length === 0 && (
                  <p className="text-sm text-gray-400">No recent activity yet.</p>
                )}
                {!logsLoading && activity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <p className="text-sm font-semibold text-white">{item.action}</p>
                    <p className="text-xs text-gray-400">{item.context}</p>
                    <p className="text-xs text-gray-500">{formatLogTime(item.timestamp)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        )}

        <div className="text-center text-xs text-gray-500">
          <Award className="mr-1 inline h-3.5 w-3.5" />
          Mindful profile updated for v0.4.1
        </div>
      </div>

      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="border-white/10 bg-[#101010] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hold Account Status</DialogTitle>
            <DialogDescription className="text-gray-300">
              Temporarily pause account activity for up to 30 days. You can reactivate anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setHoldDialogOpen(false)} className="min-h-12 border-white/20 bg-black/20 text-white hover:bg-black/35">
              Cancel
            </Button>
            <Button type="button" onClick={handleHoldAccount} className="min-h-12 bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]">
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-red-500/30 bg-[#101010] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription className="text-gray-300">
              Permanent deletion. All data (Live ID, politeness score, chats) will be erased. Cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} className="min-h-12 border-white/20 bg-black/20 text-white hover:bg-black/35">
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteAccount} className="min-h-12">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
