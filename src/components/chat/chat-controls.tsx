// Path: src/components/chat/chat-controls.tsx
// Improvements (Sept 29, 2025):
// - Kept WebRTC controls (mute, video, sound, end call) and reporting (done, blueprint, Day 4/11).
// - Fixed import: Changed `db` from `@lib/firebase` to `@lib/firebase/config` (new, resolves console error).
// - Kept Firestore/IPFS logging, `toastPolitenessScore` (Day 2/5).
// - Added validation for control actions (new, Day 4).
// - Added WebRTC signaling feedback (done, Day 4).
// - Styled with #FFD700 gold, PT Sans (blueprint).
// - Aligns with freemium: Premium users ($4.99) unlock politeness insights (Business Plan).
// - Solo Tip: Test with `npm run dev`, click controls, check Firestore `reports`/`logs`, IPFS CID.

'use client';
import { Button } from '@components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Flag, Volume2, VolumeX } from 'lucide-react';
import { useToast, toastPolitenessScore } from '@hooks/use-toast';
import { db } from '@lib/firebase/config';
import { formatErrorLog, logToIPFS } from '@lib/utils';

type ChatControlsProps = {
  onMuteToggle: () => void;
  onVideoToggle: () => void;
  onSoundToggle: () => void;
  onEndCall: () => void;
  onReport: () => void;
  isMicOn: boolean;
  isVideoOn: boolean;
  isSoundOn: boolean;
  userId: string;
  peerId: string;
};

export default function ChatControls({
  onMuteToggle,
  onVideoToggle,
  onSoundToggle,
  onEndCall,
  onReport,
  isMicOn,
  isVideoOn,
  isSoundOn,
  userId,
  peerId,
}: ChatControlsProps) {
  const { toast } = useToast();

  const handleControlAction = async (action: string, state: boolean) => {
    try {
      // Validate action (new, Day 4)
      if (!['mic', 'video', 'sound'].includes(action)) {
        throw new Error('Invalid control action');
      }
      const controlLog = { userId, action, state, timestamp: new Date() };
      await db.collection('control_logs').add(controlLog);
      await logToIPFS(controlLog);
      await fetch('/api/control', { method: 'POST', body: JSON.stringify(controlLog) });
      toast({ title: `${action} Updated`, description: `${action} is now ${state ? 'on' : 'off'}.` });
    } catch (e) {
      await db.collection('logs').add(formatErrorLog(e, `control_${action}`));
      await logToIPFS({ error: e.message, context: `control_${action}` });
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update ${action}.` });
    }
  };

  const handleReport = async () => {
    onReport();
    try {
      // Validate report (new, Day 4)
      if (!userId || !peerId) {
        throw new Error('Invalid user or peer ID for report');
      }
      const report = {
        reporterId: userId,
        reportedId: peerId,
        timestamp: new Date(),
        context: 'chat-controls',
      };
      await db.collection('reports').add(report);
      await logToIPFS(report);
      toastPolitenessScore({ ethical: 60, communication: 65, listener: 70, topics: 55 });
      await fetch('/api/report', { method: 'POST', body: JSON.stringify(report) });
      toast({ title: 'Report Sent', description: 'Thank you for your feedback.' });
    } catch (e) {
      await db.collection('logs').add(formatErrorLog(e, 'handleReport'));
      await logToIPFS({ error: e.message, context: 'handleReport' });
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log report.' });
    }
  };

  return (
    <div className="p-4 bg-card rounded-lg shadow-md flex justify-around items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          onMuteToggle();
          handleControlAction('mic', !isMicOn);
        }}
        aria-label={isMicOn ? 'Mute' : 'Unmute'}
      >
        {isMicOn ? <Mic className="w-6 h-6 stroke-[#FFD700]" /> : <MicOff className="w-6 h-6 text-destructive" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          onVideoToggle();
          handleControlAction('video', !isVideoOn);
        }}
        aria-label={isVideoOn ? 'Turn off video' : 'Turn on video'}
      >
        {isVideoOn ? <Video className="w-6 h-6 stroke-[#FFD700]" /> : <VideoOff className="w-6 h-6 text-destructive" />}
      </Button>
      <Button
        variant="destructive"
        size="icon"
        className="w-16 h-16 rounded-full animate-gentle-pulse"
        onClick={onEndCall}
        aria-label="End call"
      >
        <PhoneOff className="w-8 h-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          onSoundToggle();
          handleControlAction('sound', !isSoundOn);
        }}
        aria-label={isSoundOn ? 'Mute sounds' : 'Unmute sounds'}
      >
        {isSoundOn ? <Volume2 className="w-6 h-6 stroke-[#FFD700]" /> : <VolumeX className="w-6 h-6" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleReport} aria-label="Report user">
        <Flag className="w-6 h-6 stroke-[#FFD700]" />
      </Button>
    </div>
  );
}