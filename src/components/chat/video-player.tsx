// Path: src/components/chat/video-player.tsx
// Improvements (Sept 29, 2025):
// - Kept Card-based UI for video stream placeholders (done, Day 4, WebRTC).
// - Kept WebRTC stream integration with `useEffect`, `useToast` (done, Day 4/11).
// - Fixed import: Changed `formatErrorLog` from `@lib/firebase` to `@lib/utils` (new, resolves console error).
// - Used `@lib/firebase/config` for `db` to align with Firebase setup (new).
// - Added IPFS logging for stream state (new, Day 4).
// - Added WebRTC signaling feedback for stream status (new, Day 4).
// - Styled with #FFD700 gold, PT Sans (blueprint).
// - Aligns with freemium: Premium users ($4.99) unlock HD streams (Business Plan).
// - Solo Tip: Test with `npm run dev`, mock WebRTC stream, check Firestore `logs`, IPFS CID.

'use client';
import { useEffect, useRef } from 'react';
import { Card } from '@components/ui/card';
import { VideoOff, MicOff } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { useToast } from '@hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { formatErrorLog, logToIPFS } from '@/lib/utils';
import { collection, addDoc } from 'firebase/firestore';

type VideoPlayerProps = {
  isLocal: boolean;
  isVideoOn: boolean;
  isMuted?: boolean;
  stream?: MediaStream;
};

export default function VideoPlayer({ isLocal, isVideoOn, isMuted = false, stream }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(async (e) => {
        await addDoc(collection(db, 'logs'), formatErrorLog(e, 'videoPlayerPlay'));
        logToIPFS({ error: (e as Error).message, context: 'videoPlayerPlay' }); // IPFS (Day 4)
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to play video stream.' });
      });
    }
    // Log stream state to Firestore and IPFS (Day 2/4)
    const streamLog = {
      isLocal,
      isVideoOn,
      isMuted,
      timestamp: new Date(),
      context: 'video-player',
    };
    addDoc(collection(db, 'logs'), streamLog).catch(async (e) => {
      await addDoc(collection(db, 'logs'), formatErrorLog(e, 'videoPlayerLog'));
      logToIPFS({ error: (e as Error).message, context: 'videoPlayerLog' });
    });
    logToIPFS(streamLog);
    // WebRTC signaling feedback (Day 4)
    fetch('/api/stream', { method: 'POST', body: JSON.stringify(streamLog) }).catch(async (e) => {
      await addDoc(collection(db, 'logs'), formatErrorLog(e, 'streamSignal'));
      logToIPFS({ error: (e as Error).message, context: 'streamSignal' });
    });
  }, [stream, isVideoOn, isMuted, isLocal, toast]);

  return (
    <Card className="w-full h-full bg-muted/40 overflow-hidden relative flex items-center justify-center">
      {isVideoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal || isMuted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <VideoOff size={48} stroke="#FFD700" />
          <p className="font-medium">Video is off</p>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Badge variant={isLocal ? 'default' : 'secondary'}>
          {isLocal ? 'You' : 'olsme user'}
        </Badge>
        {isMuted && <MicOff className="w-4 h-4 text-destructive" />}
      </div>
    </Card>
  );
}
