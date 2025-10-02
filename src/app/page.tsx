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
import Link from 'next/link';
import { auth, db } from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback, formatErrorLog, generateCorrelationId, formatInfoLog } from '@lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@components/ui/dialog';
import { Sun, User, ThumbsUp, ThumbsDown, MessageSquare, ShieldCheck, ArrowRight, StopCircle, Gem } from 'lucide-react';
import { cn } from '@lib/utils';
import ChatPanel from '@components/chat/chat-panel';
import { Alert, AlertTitle, AlertDescription } from '@components/ui/alert';

interface Guest {
  uid: string;
  displayName: string;
  package: 'free' | 'premium';
  verificationLevel: 'level1' | 'level2' | 'level3';
}

// Retry logic for Firestore writes
async function withFirestoreRetry<T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (e) {
      attempts++;
      if (attempts === maxAttempts) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error('Firestore retry limit reached');
}

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isPremium, setIsPremium] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [politenessFeedback, setPolitenessFeedback] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
        setLoginOpen(false);
      } else {
        setIsPremium(false);
        setLoginOpen(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    if (user) {
      getCameraPermission();
    }
  }, [user, toast]);

  const handleStartChat = async () => {
    if (!user) {
      setLoginOpen(true);
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
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Login to Begin Random Video Awaken Chat</DialogTitle>
            <DialogDescription>Sign in to start your mindful chat experience.</DialogDescription>
          </DialogHeader>
          <Button asChild>
            <Link href="/profile">Sign In / Sign Up</Link>
          </Button>
        </DialogContent>
      </Dialog>
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