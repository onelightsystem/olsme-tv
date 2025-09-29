// Path: src/app/page.tsx
// Improvements (Sept 29, 2025):
// - Kept chat flow (idle, waiting, connected) with components (done, Day 4).
// - Fixed imports: `auth`, `db` from `@lib/firebase/config` (done).
// - Fixed auth: Synced `user` state with `useEffect` (new, resolves "Please login" error).
// - Kept WebRTC peer connection, Firebase Auth, Firestore/IPFS logging (Day 2/4/11).
// - Kept login prompt via `signInWithX`, retry logic for media (Day 2/4).
// - Added retry logic for Firestore writes (new, Day 2).
// - Styled with #FFD700 gold, PT Sans (blueprint).
// - Aligns with freemium: Premium users ($4.99) unlock HD streams, custom prompts (Business Plan).
// - Solo Tip: Test with `npm run dev`, start chat, check Firestore `logs`/`biofeedback`, IPFS CID.

'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Sun } from 'lucide-react';
import WaitingScreen from '@components/chat/waiting-screen';
import VideoPlayer from '@components/chat/video-player';
import ChatControls from '@components/chat/chat-controls';
import ChatPanel from '@components/chat/chat-panel';
import { useToast } from '@hooks/use-toast';
import { auth, db } from '@lib/firebase/config';
import { signInWithX } from '@/lib/firebase';
import { triggerBiofeedback, formatErrorLog, logToIPFS } from '@lib/utils';
import { collection, addDoc } from 'firebase/firestore';

type ChatStatus = 'idle' | 'waiting' | 'connected';

// Retry logic for Firestore writes (new, Day 2)
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
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
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
      await logToIPFS({ offer, userId: user?.uid });
    } catch (e) {
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'initPeerConnection'))
      );
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to initialize WebRTC connection.' });
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      try {
        await signInWithX();
        toast({ title: 'Logged In', description: 'Welcome to Awake Chat!' });
      } catch (e) {
        await withFirestoreRetry(() =>
          addDoc(collection(db, 'logs'), formatErrorLog(e, 'startChatLogin'))
        );
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
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), { userId: user!.uid, status: 'waiting', timestamp: new Date() })
      );
      await triggerBiofeedback(user!.uid, 'wait');
    } catch (e) {
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'startChat'))
      );
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
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), { userId: user?.uid || 'anonymous', status: 'idle', timestamp: new Date() })
    );
  };

  const handleReport = async () => {
    try {
      const report = { reporterId: user?.uid || 'anonymous', reportedId: 'peer', timestamp: new Date(), context: 'home-page' };
      await withFirestoreRetry(() => addDoc(collection(db, 'reports'), report));
      await logToIPFS(report);
      toast({ title: 'Report Sent', description: 'Thank you for your feedback.' });
    } catch (e) {
      await withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'handleReport'))
      );
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send report.' });
    }
  };

  const toggleControl = async (control: keyof typeof controls) => {
    setControls((prev) => ({ ...prev, [control]: !prev[control] }));
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), { userId: user?.uid || 'anonymous', control, state: !controls[control], timestamp: new Date() })
    );
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
      {(() => {
        switch (status) {
          case 'waiting':
            return <WaitingScreen onCancel={handleEndCall} userId={user?.uid || 'anonymous'} />;
          case 'connected':
            return (
              <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto">
                <div className="flex flex-col gap-4 flex-grow">
                  <div className="aspect-video">
                    <VideoPlayer isLocal={false} isVideoOn={true} stream={peerStream} />
                  </div>
                  <div className="aspect-video">
                    <VideoPlayer isLocal={true} isVideoOn={controls.video} isMuted={!controls.mic} stream={localStream} />
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
                  />
                </div>
              </div>
            );
          case 'idle':
          default:
            return (
              <Card className="w-full max-w-md text-center shadow-xl bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <Sun className="mx-auto h-16 w-16 text-primary mb-4" />
                  <h1 className="text-3xl font-bold font-headline mb-2 text-foreground">
                    Welcome to olsme.tv
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    Connect and practice Mindful Video Chat.
                  </p>
                  <Button size="lg" onClick={handleStartChat} className="w-full animate-gentle-pulse">
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
