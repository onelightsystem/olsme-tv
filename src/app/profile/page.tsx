// Path: src/app/profile/page.tsx
// Improvements (Sept 30, 2025):
// - Added profile UI with verification level, politeness score, olsPoints (Day 15).
// - Fixed imports: Changed `auth`, `db`, `requestKYCVerification` from `@lib/firebase` to `@lib/firebase/config` (Day 16).
// - Replaced `logToIPFS` import from `utils.ts` to dynamic import from `ipfs-client.ts` (Day 16, resolves 'electron' SSR error).
// - Used PT Sans, #FFD700 gold, Radix dialogs (blueprint).
// - Integrated Firebase Auth, Firestore for user data (Day 2).
// - Added IPFS logging for profile views (Day 4).
// - Aligns with freemium: Premium users ($4.99) see detailed analytics (Business Plan).
// - Solo Tip: Test with `npm run dev`, visit `/profile`, check Firestore `logs`, IPFS CID.

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, db, requestKYCVerification } from '@lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Progress } from '@components/ui/progress';
import { Sun, ShieldCheck, Gem, Award } from 'lucide-react';
import { formatPolitenessScore } from '@lib/utils';
import { Skeleton } from '@components/ui/skeleton';
import { useToast } from '@hooks/use-toast';
import { Button } from '@components/ui/button';

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  package: 'free' | 'premium' | 'starter';
  verificationLevel: 'level1' | 'level2' | 'level3';
  politenessScore: {
    ethical: number;
    communication: number;
    listener: number;
    topics: number;
  };
  olsPoints: number;
  createdAt: any;
  location: string;
  age: number;
  status?: string;
  subscriptionStatus?: string;
};

const verificationLevelText = {
  level1: 'Level 1: Unverified',
  level2: 'Level 2: Video Verified',
  level3: 'Level 3: KYC Verified',
};

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRequestingKYC, setIsRequestingKYC] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const { logToIPFS } = await import('@lib/ipfs-client');
        await logToIPFS({ userId: u.uid, action: 'profile_view' });
      }
      if (!u) {
        setLoading(false);
        setProfile(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find user profile.' });
          setProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load profile.' });
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    }
  }, [user, toast]);

  const handleRequestKYC = async () => {
    setIsRequestingKYC(true);
    try {
      await requestKYCVerification(user!.uid);
      toast({
        title: 'Request Sent',
        description: 'Your KYC verification request has been sent to the admin.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: (error as Error).message || 'An unknown error occurred.',
      });
    } finally {
      setIsRequestingKYC(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-around">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-12 w-1/3 mx-auto" />
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold">Please log in to view your profile.</h1>
      </div>
    );
  }

  const { average, badge, message } = formatPolitenessScore(profile.politenessScore);
  const hasActiveSubscription = profile.status === 'active' || profile.subscriptionStatus === 'active' || profile.package === 'premium';

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {!hasActiveSubscription && (
        <div className="mb-4 rounded-xl border border-[#FFD700]/30 bg-[rgba(17,17,17,0.82)] p-4 text-[#FFE7A0] backdrop-blur-md">
          <p className="text-sm font-semibold">Upgrade to unlock unlimited mindful chats.</p>
          <Link href="/subscribe" className="mt-2 inline-block text-sm font-bold text-[#FFD700] underline-offset-4 hover:underline">
            Go to Subscribe
          </Link>
        </div>
      )}
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <Sun className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">{profile.displayName}</CardTitle>
          <CardDescription>{profile.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-sm text-muted-foreground">Package</p>
              <Badge variant={profile.package === 'premium' ? 'default' : 'secondary'} className="capitalize flex items-center gap-1">
                <Gem className="h-4 w-4" /> {profile.package}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verification</p>
              <Badge variant="outline" className="capitalize flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> {verificationLevelText[profile.verificationLevel]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">OLS Points</p>
              <Badge variant="outline" className="capitalize flex items-center gap-1">
                <Award className="h-4 w-4" /> {profile.olsPoints || 0}
              </Badge>
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-center">Politeness Score</h3>
            <div className="text-center">
              <span className={`text-4xl font-bold ${
                badge === 'Gold' ? 'text-primary' : badge === 'Silver' ? 'text-slate-400' : 'text-yellow-700'
              }`}>{average}</span>
              <span className="text-muted-foreground">/100</span>
            </div>
            <Progress value={average} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{badge}: {message}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p>Ethical: {profile.politenessScore.ethical}</p>
              <Progress value={profile.politenessScore.ethical} className="h-1" />
            </div>
            <div className="space-y-1">
              <p>Communication: {profile.politenessScore.communication}</p>
              <Progress value={profile.politenessScore.communication} className="h-1" />
            </div>
            <div className="space-y-1">
              <p>Listener: {profile.politenessScore.listener}</p>
              <Progress value={profile.politenessScore.listener} className="h-1" />
            </div>
            <div className="space-y-1">
              <p>Topics: {profile.politenessScore.topics}</p>
              <Progress value={profile.politenessScore.topics} className="h-1" />
            </div>
          </div>
          <div className="border-t pt-4 mt-4 text-sm text-muted-foreground">
            <p><strong>Location:</strong> {profile.location || 'Not set'}</p>
            <p><strong>Age:</strong> {profile.age || 'Not set'}</p>
          </div>
        </CardContent>
        {profile.verificationLevel !== 'level3' && (
          <CardFooter className="flex-col gap-2 border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Become a fully verified member to enjoy all benefits.
            </p>
            <Button
              onClick={handleRequestKYC}
              disabled={isRequestingKYC || profile.verificationLevel !== 'level2'}
            >
              {isRequestingKYC ? 'Requesting...' : 'Request Level 3 (KYC) Verification'}
            </Button>
            {profile.verificationLevel === 'level1' && (
              <p className="text-xs text-destructive text-center">
                You must be Level 2 (Video Verified) to request KYC verification.
              </p>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}