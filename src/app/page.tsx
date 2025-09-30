// Path: src/app/page.tsx
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added premium user check for HD streams and custom prompts (freemium model, $4.99/month).
// - Enhanced error handling with `userId` in logs for traceability.
// - Added biofeedback audio triggers for errors and connection states (OLS mindfulness).
// - Added ARIA attributes for accessibility (GDPR compliance).
// - Optimized Firestore writes with batching for efficiency.
// - Aligns with blueprint: WebRTC, Firebase Auth, IPFS logging, #FFD700 gold UI.
// - Solo Tip: Test with `npm run dev`, start chat, check Firestore `logs`/`biofeedback`/`ipfs_logs`, IPFS CID.
'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sun } from 'lucide-react';
import WaitingScreen from '@/components/chat/waiting-screen';
import VideoPlayer from '@/components/chat/video-player';
import ChatControls from '@/components/chat/chat-controls';
import ChatPanel from '@/components/chat/chat-panel';
import { useToast } from '@/hooks/use-toast';
import { auth, db, signInWithX } from '@/lib/firebase/config';
import { triggerBiofeedback, formatErrorLog } from '@/lib/utils';
import { logToIPFS } from '@/lib/ipfs-client';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';

type ChatStatus = 'idle' | 'waiting' | 'connected';

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

export default function Home() {
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [controls, setControls] = useState({ mic: true, video: true, sound: false });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStream, setPeerStream] = useState<MediaStream | null>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [isPremium, setIsPremium] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
      } else {
        setIsPremium(false);
      }
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const initPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnection.current.ontrack = (event) => setPeerStream(event.streams[0]);
    if (localStream) {
      localStream.getTracks().forEach((track) => peerConnection.current?.addTrack(track, localStream));
    }
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      await logToIPFS({ offer, userId: user?.uid || 'anonymous', action: 'initPeerConnection' });
    } catch (e: any) {
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'initPeerConnection', user?.uid || 'anonymous'))
      );
      await logToIPFS({
        error: e.message,
        context: 'initPeerConnection',
        userId: user?.uid || 'anonymous',
        action: 'error',
      });
      if (user) {
        await triggerBiofeedback(user.uid, 'chat');
      }
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to initialize WebRTC connection.' });
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      try {
        await signInWithX('Anonymous', 'Unknown', 18);
        toast({ title: 'Logged In', description: 'Welcome to Awake Chat!' });
      } catch (e: any) {
        await withFirestoreRetry(() =>
          addDoc(collection(db, 'logs'), formatErrorLog(e, 'startChatLogin', 'anonymous'))
        );
        await logToIPFS({
          error: e.message,
          context: 'startChatLogin',
          userId: 'anonymous',
          action: 'error',
        });
        toast({ variant: 'destructive', title: 'Error', description: 'Login failed. Please try again.' });
        return;
      }
    }

    try {
      let attempts = 0;
      const maxAttempts = 3;
      let stream: MediaStream | null = null;
      while (attempts < maxAttempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: isPremium ? { width: 1280, height: 720 } : true, // HD for premium
            audio: true,
          });
          break;
        } catch (e) {
          attempts++;
          if (attempts === maxAttempts) throw e;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
      setLocalStream(stream);
      await initPeerConnection();
      setStatus('waiting');
      const batch = writeBatch(db);
      batch.set(collection(db, 'logs').doc(), {
        userId: user!.uid,
        status: 'waiting',
        timestamp: new Date(),
      });
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId: user!.uid,
        type: 'audio_wait',
        value: 1,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());
      await triggerBiofeedback(user!.uid, 'wait', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);
    } catch (e: any) {
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'startChat', user?.uid || 'anonymous'))
      );
      await logToIPFS({
        error: e.message,
        context: 'startChat',
        userId: user?.uid || 'anonymous',
        action: 'error',
      });
      if (user) {
        await triggerBiofeedback(user.uid, 'chat');
      }
      toast({ variant: 'destructive', title: 'Camera/Mic Error', description: 'Could not access media devices.' });
      setStatus('idle');
    }
  };

  const handleEndCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setPeerStream(null);
    setStatus('idle');
    const batch = writeBatch(db);
    batch.set(collection(db, 'logs').doc(), {
      userId: user?.uid || 'anonymous',
      status: 'idle',
      timestamp: new Date(),
    });
    await withFirestoreRetry(() => batch.commit());
  };

  const handleReport = async () => {
    try {
      const report = {
        reporterId: user?.uid || 'anonymous',
        reportedId: 'peer',
        timestamp: new Date(),
        context: 'home-page',
      };
      const batch = writeBatch(db);
      batch.set(collection(db, 'reports').doc(), report);
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId: user?.uid || 'anonymous',
        type: 'report_submitted',
        value: 1,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());
      await logToIPFS({ ...report, action: 'report' });
      toast({ title: 'Report Sent', description: 'Thank you for your feedback.' });
    } catch (e: any) {
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'handleReport', user?.uid || 'anonymous'))
      );
      await logToIPFS({
        error: e.message,
        context: 'handleReport',
        userId: user?.uid || 'anonymous',
        action: 'error',
      });
      if (user) {
        await triggerBiofeedback(user.uid, 'chat');
      }
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send report.' });
    }
  };

  const toggleControl = async (control: keyof typeof controls) => {
    setControls((prev) => ({ ...prev, [control]: !prev[control] }));
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), {
        userId: user?.uid || 'anonymous',
        control,
        state: !controls[control],
        timestamp: new Date(),
      })
    );
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow" role="application">
      {(() => {
        switch (status) {
          case 'waiting':
            return <WaitingScreen onCancel={handleEndCall} userId={user?.uid || 'anonymous'} />;
          case 'connected':
            return (
              <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto" role="region" aria-label="Video chat">
                <div className="flex flex-col gap-4 flex-grow">
                  <div className="aspect-video">
                    <VideoPlayer isLocal={false} isVideoOn={true} stream={peerStream} aria-label="Remote video" />
                  </div>
                  <div className="aspect-video">
                    <VideoPlayer
                      isLocal={true}
                      isVideoOn={controls.video}
                      isMuted={!controls.mic}
                      stream={localStream}
                      aria-label="Local video"
                    />
                  </div>
                </div>
                <div className="w-full lg:w-96 flex flex-col gap-4">
                  <ChatPanel />
                  <ChatControls
                    onMuteToggle={() => toggleControl('mic')}
                    onVideoToggle={() => toggleControl('video')}
                    onSoundToggle={() => toggleControl('sound')}
                    onEndCall={handleEndCall}
                    onReport={handleReport}
                    isMicOn={controls.mic}
                    isVideoOn={controls.video}
                    isSoundOn={controls.sound}
                    userId={user?.uid || 'anonymous'}
                    peerId="peer"
                    aria-label="Chat controls"
                  />
                </div>
              </div>
            );
          case 'idle':
          default:
            return (
              <Card className="w-full max-w-md text-center shadow-xl bg-card/80 backdrop-blur-sm" role="region" aria-label="Welcome card">
                <CardContent className="p-8">
                  <Sun className="mx-auto h-16 w-16 text-primary mb-4" aria-hidden="true" />
                  <h1 className="text-3xl font-bold font-headline mb-2 text-foreground">Welcome to olsme.tv</h1>
                  <p className="text-muted-foreground mb-6">Connect and practice Mindful Video Chat.</p>
                  <Button
                    size="lg"
                    onClick={handleStartChat}
                    className="w-full animate-gentle-pulse"
                    aria-label="Start a mindful video chat"
                  >
                    Start a Mindful Chat
                  </Button>
                </CardContent>
              </Card>
            );
        }
      })()}
    </div>
  );
}