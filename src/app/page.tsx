// Path: src/app/page.tsx
// Improvements (Oct 2, 2025):
// - Fixed Firestore batch write syntax to use `doc(collection(db, 'collectionName'))`.
// - Ensured fresh WriteBatch instances to avoid reuse after commit (resolves FirebaseError).
// - Replaced popup with dual-screen layout: left (guest profiles), right (camera window).
// - Added chat option, politeness toggle, guest rating, next/stop buttons, login window.
// - Integrated premium visuals/audio ($4.99/month) and mindfulness prompts.
// - Ensured accessibility with ARIA attributes (GDPR compliance).
// - Solo Tip: Test with `npm run dev`, visit `/`, check Firestore `ratings`/`logs`/`biofeedback_events`, IPFS CID.
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { auth, db } from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback, formatErrorLog, generateCorrelationId, formatInfoLog } from '@lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Sun, User, ThumbsUp, ThumbsDown, MessageSquare, ShieldCheck, ArrowRight, StopCircle, Gem } from 'lucide-react';
import { cn } from '@lib/utils';
import ChatPanel from '@components/chat/chat-panel';
import { Alert, AlertTitle, AlertDescription } from '@components/ui/alert';
import AuthModal from '@components/auth/auth-modal';
import LoginModal from '@components/chat/login-modal';
import SubscriptionCards from '@components/landing/subscription-cards';
import { getUserSubscriptionStatus } from '@lib/subscription';

interface Guest {
  uid: string;
  displayName: string;
  package: 'free' | 'starter' | 'premium';
  verificationLevel: 'level1' | 'level2' | 'level3';
}

const STAR_POSITIONS = [
  { left: '5%', top: '8%', size: 1, duration: 11, delay: 0 },
  { left: '12%', top: '23%', size: 1.5, duration: 14, delay: 2 },
  { left: '19%', top: '63%', size: 2, duration: 12, delay: 1 },
  { left: '31%', top: '82%', size: 1.5, duration: 10, delay: 3 },
  { left: '44%', top: '57%', size: 2, duration: 8, delay: 5 },
  { left: '55%', top: '74%', size: 1.5, duration: 14, delay: 2 },
  { left: '67%', top: '42%', size: 2, duration: 9, delay: 0 },
  { left: '79%', top: '34%', size: 1.5, duration: 11, delay: 6 },
  { left: '91%', top: '11%', size: 2, duration: 10, delay: 7 },
  { left: '3%', top: '77%', size: 1.5, duration: 12, delay: 5 },
  { left: '22%', top: '5%', size: 2, duration: 11, delay: 5 },
  { left: '47%', top: '44%', size: 1, duration: 13, delay: 1 },
  { left: '58%', top: '95%', size: 1.5, duration: 9, delay: 4 },
  { left: '70%', top: '13%', size: 1, duration: 14, delay: 2 },
  { left: '82%', top: '47%', size: 2, duration: 10, delay: 8 },
  { left: '97%', top: '36%', size: 1, duration: 12, delay: 6 },
  { left: '34%', top: '67%', size: 1.5, duration: 15, delay: 0 },
  { left: '75%', top: '3%', size: 1, duration: 11, delay: 3 },
];

const LOGIN_DUST_PARTICLES = [
  { left: '8%', top: '14%', size: 4, duration: 22, delay: 0 },
  { left: '18%', top: '72%', size: 6, duration: 30, delay: 3 },
  { left: '26%', top: '36%', size: 3, duration: 24, delay: 1 },
  { left: '34%', top: '22%', size: 5, duration: 28, delay: 5 },
  { left: '42%', top: '68%', size: 4, duration: 26, delay: 2 },
  { left: '50%', top: '44%', size: 6, duration: 32, delay: 8 },
  { left: '58%', top: '18%', size: 3, duration: 20, delay: 2 },
  { left: '64%', top: '78%', size: 5, duration: 27, delay: 6 },
  { left: '72%', top: '34%', size: 4, duration: 25, delay: 9 },
  { left: '80%', top: '62%', size: 6, duration: 31, delay: 4 },
  { left: '88%', top: '24%', size: 4, duration: 23, delay: 7 },
  { left: '14%', top: '50%', size: 5, duration: 29, delay: 10 },
  { left: '46%', top: '12%', size: 3, duration: 21, delay: 1 },
  { left: '66%', top: '52%', size: 4, duration: 24, delay: 11 },
];

// Retry logic for Firestore writes
async function withFirestoreRetry<T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('write batch can no longer be used after commit')) {
        throw e;
      }
      attempts++;
      if (attempts === maxAttempts) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error('Firestore retry limit reached');
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [politenessFeedback, setPolitenessFeedback] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
          const subscription = await getUserSubscriptionStatus(u.uid);
          setSubscriptionActive(subscription.isActive);
          if (!subscription.isActive) {
            router.replace('/subscribe');
            return;
          }
          setLoginOpen(false);
        } catch {
          setIsPremium(false);
          setSubscriptionActive(false);
          toast({ variant: 'destructive', title: 'Error', description: 'Unable to load subscription status. Please refresh the page or contact support if the issue persists.', id: 'subscription-load-error' });
        } finally {
          setLoading(false);
        }
      } else {
        setIsPremium(false);
        setSubscriptionActive(false);
        setLoginOpen(true);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  useEffect(() => {
    // Fetch potential guests
    const fetchGuests = async () => {
      if (!user) return;
      const correlationId = generateCorrelationId();
      try {
        const functions = getFunctions();
        const searchUsers = httpsCallable(functions, 'searchUsers');
        const response = (await searchUsers({ query: '', verificationLevel: 'all' })) as { data: { users: Guest[] } };
        setGuests(response.data.users);
        if (response.data.users.length > 0) {
          setCurrentGuest(response.data.users[0]);
        }
      } catch (e: any) {
        const batch = writeBatch(db); // Fresh batch
        batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'fetchGuests', user?.uid || 'anonymous', correlationId));
        batch.set(doc(collection(db, 'biofeedback_events')), {
          userId: user?.uid || 'anonymous',
          type: 'error',
          value: 0,
          correlationId,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());
        await logToIPFS({
          userId: user?.uid || 'anonymous',
          action: 'error',
          context: 'fetchGuests',
          error: e.message,
          correlationId,
          timestamp: new Date().toISOString(),
        });
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load guests.', id: 'fetch-guests-error' });
      }
    };
    if (user) {
      fetchGuests();
    }
  }, [user, toast]);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };
    if (user && subscriptionActive) {
      getCameraPermission();
    }
  }, [user, toast, subscriptionActive]);

  const handleStartChat = async () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }

    if (!subscriptionActive) {
      toast({
        variant: 'destructive',
        title: 'Subscription required',
        description: 'Subscribe to unlock full sessions.',
        id: 'subscription-required',
      });
      router.push('/subscribe');
      return;
    }

    const correlationId = generateCorrelationId();
    try {
      const batch = writeBatch(db); // Fresh batch
      batch.set(doc(collection(db, 'logs')), formatInfoLog('start_chat', user.uid, correlationId));
      batch.set(doc(collection(db, 'biofeedback_events')), {
        userId: user.uid,
        type: 'chat_start',
        value: 1,
        correlationId,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());
      await logToIPFS({
        userId: user.uid,
        action: 'start_chat',
        premium: isPremium,
        correlationId,
        timestamp: new Date().toISOString(),
      });
      await triggerBiofeedback(user.uid, 'chat', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);
      toast({ title: 'Chat Started', description: 'Mindful chat initiated!', id: 'chat-start' });
    } catch (e: any) {
      const batch = writeBatch(db); // Fresh batch
      batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'startChat', user.uid, correlationId));
      batch.set(doc(collection(db, 'biofeedback_events')), {
        userId: user.uid,
        type: 'error',
        value: 0,
        correlationId,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());
      await logToIPFS({
        userId: user.uid,
        action: 'error',
        context: 'startChat',
        error: e.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
      await triggerBiofeedback(user.uid, 'chat');
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to start chat.', id: 'chat-error' });
    }
  };

  const handleRateGuest = async (rating: 'good' | 'bad') => {
    if (!user || !currentGuest) return;
    const correlationId = generateCorrelationId();
    try {
      const functions = getFunctions();
      const rateGuest = httpsCallable(functions, 'rateGuest');
      await rateGuest({ guestId: currentGuest.uid, rating });
      const batch = writeBatch(db); // Fresh batch
      batch.set(doc(collection(db, 'ratings')), {
        userId: user.uid,
        guestId: currentGuest.uid,
        rating,
        correlationId,
        timestamp: new Date(),
      });
      batch.set(doc(collection(db, 'biofeedback_events')), {
        userId: user.uid,
        type: `rating_${rating}`,
        value: 1,
        correlationId,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());
      await logToIPFS({
        userId: user.uid,
        action: `rating_${rating}`,
        guestId: currentGuest.uid,
        premium: isPremium,
        correlationId,
        timestamp: new Date().toISOString(),
      });
      toast({ title: 'Rating Submitted', description: `Rated ${currentGuest.displayName} as ${rating}.`, id: 'rating-submitted' });
    } catch (e: any) {
      const batch = writeBatch(db); // Fresh batch
      batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'rateGuest', user.uid, correlationId));
      batch.set(doc(collection(db, 'biofeedback_events')), {
        userId: user.uid,
        type: 'error',
        value: 0,
        correlationId,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());
      await logToIPFS({
        userId: user.uid,
        action: 'error',
        context: 'rateGuest',
        error: e.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit rating.', id: 'rating-error' });
    }
  };

  const handleNextGuest = () => {
    if (guests.length <= 1) return;
    const currentIndex = guests.findIndex(g => g.uid === currentGuest?.uid);
    const nextIndex = (currentIndex + 1) % guests.length;
    setCurrentGuest(guests[nextIndex]);
  };

  const handleStopChat = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasCameraPermission(null);
    setChatOpen(false);
    setPolitenessFeedback(false);
    toast({ title: 'Chat Stopped', description: 'Chat session ended.', id: 'chat-stop' });
  };

  if (loading) {
    return <div className="container mx-auto p-4 flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-white">
        {/* ── Background: deep gradient ── */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              'radial-gradient(circle at 15% 20%, rgba(255, 215, 0, 0.06), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255, 170, 0, 0.04), transparent 45%)',
          }}
          aria-hidden="true"
        />

        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
          {STAR_POSITIONS.map((star, index) => (
            <span
              key={`star-${index}`}
              className="absolute rounded-full bg-white star-twinkle"
              style={{
                left: star.left,
                top: star.top,
                width: `${star.size}px`,
                height: `${star.size}px`,
                '--twinkle-duration': `${star.duration}s`,
                '--twinkle-delay': `${star.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* ── Background: golden dust particles ── */}
        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
          {LOGIN_DUST_PARTICLES.map((particle, index) => (
            <motion.span
              key={`gold-dust-${index}`}
              className="absolute rounded-full bg-[#FFD700]"
              style={{
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
              }}
              animate={{ y: -24, x: 8, opacity: 0.16 }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
                delay: particle.delay,
              }}
            />
          ))}
        </div>

        <div className="absolute left-4 top-4 z-20 flex items-center gap-3 rounded-full border border-[#FFD700]/20 bg-black/30 px-4 py-2 backdrop-blur-md sm:left-6 sm:top-6">
          <span className="rounded-full bg-[#FFD700]/10 p-2 shadow-[0_0_28px_rgba(255,215,0,0.38)]">
            <Sun className="h-6 w-6 text-[#FFD700] sm:h-7 sm:w-7" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-wide text-[#FFE7A0] sm:text-lg">olsme.tv</span>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-28 sm:px-8">
          <div className="w-full max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-black/25 px-6 py-8 backdrop-blur-md"
            >
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
                Begin Your Random Video Awaken Chat
              </h1>
              <p className="mt-4 text-base text-gray-300 sm:text-xl">
                Sign in to start your mindful chat experience.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button
                  variant="outline"
                  className="min-h-12 rounded-2xl border-white/15 bg-black/20 px-8 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    setAuthInitialTab('signin');
                    setAuthOpen(true);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  className="min-h-12 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFAA00] px-8 font-bold text-[#0F0F0F] shadow-lg shadow-[#FFD700]/25 hover:shadow-xl hover:shadow-[#FFD700]/35"
                  onClick={() => {
                    setAuthInitialTab('signup');
                    setAuthOpen(true);
                  }}
                >
                  Sign Up
                </Button>
              </div>
            </motion.div>

            <div className="mt-8">
              <SubscriptionCards
                onSignUp={() => {
                  setAuthInitialTab('signup');
                  setAuthOpen(true);
                }}
                onUpgrade={() => {
                  setAuthInitialTab('signup');
                  setAuthOpen(true);
                }}
              />
            </div>
          </div>

          <LoginModal
            open={loginOpen}
            onOpenChange={setLoginOpen}
            onContinue={() => {
              setLoginOpen(false);
              setAuthInitialTab('signin');
              setAuthOpen(true);
            }}
          />
        </div>

        <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialTab={authInitialTab} />
      </main>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Screen: Potential Guests */}
        <Card className={cn('shadow-xl bg-card/80 backdrop-blur-sm', isPremium && 'premium-video animate-premium-pulse')}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" aria-hidden="true" />
              Potential Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guests.length > 0 ? (
              guests.map(guest => (
                <div key={guest.uid} className="flex items-center justify-between p-2 border-b">
                  <div className="flex items-center gap-2">
                    <User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{guest.displayName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn(guest.package === 'premium' && "text-primary font-bold flex items-center gap-1")}>
                          {guest.package === 'premium' && <Gem className="h-3 w-3" />}
                          {guest.package}
                        </span>
                        <span>|</span>
                        <span>{guest.verificationLevel}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentGuest(guest)}
                    aria-label={`Select ${guest.displayName}`}
                    disabled={currentGuest?.uid === guest.uid}
                  >
                    {currentGuest?.uid === guest.uid ? 'Selected' : 'Select'}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No guests available.</p>
            )}
          </CardContent>
        </Card>
        {/* Right Screen: Camera Window */}
        <Card className={cn('shadow-xl bg-card/80 backdrop-blur-sm', isPremium && 'premium-video animate-premium-pulse')}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Sun className="h-6 w-6 text-primary" aria-hidden="true" />
              Your Scene
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted />
            </div>
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-center flex-wrap gap-2 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(!chatOpen)}
                aria-label={chatOpen ? 'Close chat' : 'Open chat'}
              >
                <MessageSquare className="h-6 w-6 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPolitenessFeedback(!politenessFeedback)}
                aria-label={politenessFeedback ? 'Hide politeness feedback' : 'Show politeness feedback'}
              >
                <ShieldCheck className="h-6 w-6 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRateGuest('good')}
                aria-label="Rate guest good"
                disabled={!currentGuest}
              >
                <ThumbsUp className="h-6 w-6 text-green-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRateGuest('bad')}
                aria-label="Rate guest bad"
                disabled={!currentGuest}
              >
                <ThumbsDown className="h-6 w-6 text-red-500" />
              </Button>
              <Button
                variant="outline"
                onClick={handleNextGuest}
                aria-label="Next guest"
                disabled={guests.length <= 1}
              >
                <ArrowRight className="mr-2 h-4 w-4" /> Next
              </Button>
              <Button
                variant="destructive"
                onClick={handleStopChat}
                aria-label="Stop chat"
              >
                <StopCircle className="mr-2 h-4 w-4" /> Stop
              </Button>
            </div>
            {chatOpen && (
              <div className="mt-4">
                <ChatPanel />
              </div>
            )}
            {politenessFeedback && user && currentGuest && (
              <div className="mt-4 p-2 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Politeness feedback for {currentGuest.displayName}: Ethical: 80, Communication: 75, Listener: 85, Topics: 70
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Button
        size="lg"
        className="mt-4 w-full animate-gentle-pulse"
        onClick={handleStartChat}
        aria-label="Start mindful chat"
        disabled={!hasCameraPermission}
      >
        Start a Mindful Chat
      </Button>
    </div>
  );
}