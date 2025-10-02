// Path: src/components/chat/video-player.tsx
// Improvements (Sept 30, 2025):
// - Removed invalid CSS code (`.premium-video`, `.hd-stream`) as it’s in `globals.css` (resolves parsing error).
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves import error).
// - Added premium user check for HD streams and premium badge (freemium model, $4.99/month).
// - Added biofeedback audio triggers for errors and stream state (OLS mindfulness).
// - Enhanced error handling with `userId` in logs for traceability.
// - Added batch Firestore writes and retry logic for performance.
// - Enhanced ARIA attributes for accessibility (GDPR compliance).
// - Styled with #FFD700 gold, PT Sans (blueprint).
// - Aligns with blueprint: WebRTC streams, IPFS logging, freemium HD.
// - Solo Tip: Test with `npm run dev`, mock WebRTC stream, check Firestore `logs`/`biofeedback_events`, IPFS CID.
'use client';
import { useEffect, useRef, useState } from 'react';
import { Card } from '@components/ui/card';
import { VideoOff, MicOff, Gem } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { useToast } from '@hooks/use-toast';
import { db, auth } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { cn } from '@lib/utils';

type VideoPlayerProps = {
  isLocal: boolean;
  isVideoOn: boolean;
  isMuted?: boolean;
  stream?: MediaStream;
};

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

export default function VideoPlayer({ isLocal, isVideoOn, isMuted = false, stream }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();
  const user = auth.currentUser;

  useEffect(() => {
    // Check for premium user
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then((userDoc) => {
        setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
      });
    }

    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(async (e: any) => {
        const batch = writeBatch(db);
        batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'videoPlayerPlay', user?.uid || 'anonymous'));
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId: user?.uid || 'anonymous',
          type: 'error',
          value: 0,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          error: e.message,
          context: 'videoPlayerPlay',
          userId: user?.uid || 'anonymous',
          action: 'error',
          timestamp: new Date().toISOString(),
        });

        if (user) {
          await triggerBiofeedback(user.uid, 'chat', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to play video stream.',
          id: 'video-play-error',
        });
      });
    }

    // Log stream state to Firestore and IPFS
    const streamLog = {
      userId: user?.uid || 'anonymous',
      isLocal,
      isVideoOn,
      isMuted,
      timestamp: new Date(),
      context: 'video-player',
    };

    withFirestoreRetry(async () => {
      const batch = writeBatch(db);
      batch.set(collection(db, 'logs').doc(), streamLog);
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId: user?.uid || 'anonymous',
        type: `video_${isVideoOn ? 'on' : 'off'}`,
        value: isVideoOn ? 1 : 0,
        timestamp: new Date(),
      });
      await batch.commit();
    }).catch(async (e: any) => {
      const batch = writeBatch(db);
      batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'videoPlayerLog', user?.uid || 'anonymous'));
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId: user?.uid || 'anonymous',
        type: 'error',
        value: 0,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());

      await logToIPFS({
        error: e.message,
        context: 'videoPlayerLog',
        userId: user?.uid || 'anonymous',
        action: 'error',
        timestamp: new Date().toISOString(),
      });

      if (user) {
        await triggerBiofeedback(user.uid, 'chat', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);
      }
    });

    logToIPFS({ ...streamLog, action: `video_${isVideoOn ? 'on' : 'off'}` });

  }, [stream, isVideoOn, isMuted, isLocal, toast, user, isPremium]);

  return (
    <Card
      className={cn(
        'w-full h-full bg-muted/40 overflow-hidden relative flex items-center justify-center',
        isPremium && 'premium-video' // Custom styles for premium users
      )}
      role="region"
      aria-label={isLocal ? 'Local video player' : 'Remote video player'}
    >
      {isVideoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal || isMuted}
          className={cn('w-full h-full object-cover', isPremium && 'hd-stream')} // HD for premium
          aria-label={isLocal ? 'Your video stream' : 'Remote user video stream'}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <VideoOff size={48} stroke="#FFD700" aria-hidden="true" />
          <p className="font-medium">Video is off</p>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Badge variant={isLocal ? 'default' : 'secondary'} aria-label={isLocal ? 'You' : 'Remote user'}>
          {isLocal ? 'You' : 'olsme user'}
          {isPremium && <Gem className="w-4 h-4 ml-1 text-primary" aria-hidden="true" />}
        </Badge>
        {isMuted && <MicOff className="w-4 h-4 text-destructive" aria-hidden="true" />}
      </div>
    </Card>
  );
}