// Path: src/components/chat/chat-controls.tsx
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added premium user check for enhanced politeness insights (freemium model, $4.99/month).
// - Added biofeedback audio triggers for control actions and errors (OLS mindfulness).
// - Enhanced error handling with `userId` in logs for traceability.
// - Removed non-existent API calls (`/api/control`, `/api/report`).
// - Added batch Firestore writes for performance.
// - Enhanced ARIA attributes for accessibility (GDPR compliance).
// - Styled with #FFD700 gold, PT Sans (blueprint).
// - Aligns with blueprint: WebRTC controls, AI politeness, IPFS logging.
// - Solo Tip: Test with `npm run dev`, click controls, check Firestore `reports`/`logs`/`biofeedback_events`, IPFS CID.
'use client';
import { Button } from '@components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Flag, Volume2, VolumeX } from 'lucide-react';
import { useToast, toastPolitenessScore } from '@hooks/use-toast';
import { db } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';

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
      // Validate action
      if (!['mic', 'video', 'sound'].includes(action)) {
        throw new Error('Invalid control action');
      }

      // Check for premium user
      const userDoc = await getDoc(doc(db, 'users', userId));
      const isPremium = userDoc.exists() && userDoc.data()?.package === 'premium';

      // Batch Firestore writes
      const batch = writeBatch(db);
      const controlLog = { userId, action, state, timestamp: new Date() };
      batch.set(collection(db, 'control_logs').doc(), controlLog);
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId,
        type: `control_${action}`,
        value: state ? 1 : 0,
        timestamp: new Date(),
      });
      await batch.commit();

      // Log to IPFS
      await logToIPFS({ ...controlLog, action: `control_${action}` });

      // Mindfulness: Trigger calming audio
      await triggerBiofeedback(userId, 'chat', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);

      toast({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Updated`,
        description: `${action} is now ${state ? 'on' : 'off'}.`,
        id: `control-${action}`,
      });
    } catch (e: any) {
      const batch = writeBatch(db);
      batch.set(collection(db, 'logs').doc(), formatErrorLog(e, `control_${action}`, userId));
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId,
        type: 'error',
        value: 0,
        timestamp: new Date(),
      });
      await batch.commit();

      await logToIPFS({
        error: e.message,
        context: `control_${action}`,
        userId,
        action: 'error',
        timestamp: new Date().toISOString(),
      });

      await triggerBiofeedback(userId, 'chat');

      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update ${action}.`,
        id: `control-error-${action}`,
      });
    }
  };

  const handleReport = async () => {
    onReport();
    try {
      // Validate report
      if (!userId || !peerId) {
        throw new Error('Invalid user or peer ID for report');
      }

      // Check for premium user
      const userDoc = await getDoc(doc(db, 'users', userId));
      const isPremium = userDoc.exists() && userDoc.data()?.package === 'premium';

      // Batch Firestore writes
      const batch = writeBatch(db);
      const report = {
        reporterId: userId,
        reportedId: peerId,
        timestamp: new Date(),
        context: 'chat-controls',
      };
      batch.set(collection(db, 'reports').doc(), report);
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId,
        type: 'report_submitted',
        value: 1,
        timestamp: new Date(),
      });
      await batch.commit();

      // Log to IPFS
      await logToIPFS({ ...report, action: 'report' });

      // Politeness score with premium enhancement
      await toastPolitenessScore({
        ethical: 60,
        communication: 65,
        listener: 70,
        topics: 55,
        userId,
        isPremium,
      });

      // Mindfulness: Trigger calming audio
      await triggerBiofeedback(userId, 'chat', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);

      toast({
        title: 'Report Sent',
        description: 'Thank you for your feedback.',
        id: 'report-success',
      });
    } catch (e: any) {
      const batch = writeBatch(db);
      batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'handleReport', userId));
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId,
        type: 'error',
        value: 0,
        timestamp: new Date(),
      });
      await batch.commit();

      await logToIPFS({
        error: e.message,
        context: 'handleReport',
        userId,
        action: 'error',
        timestamp: new Date().toISOString(),
      });

      await triggerBiofeedback(userId, 'chat');

      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log report.',
        id: 'report-error',
      });
    }
  };

  return (
    <div
      className="p-4 bg-card rounded-lg shadow-md flex justify-around items-center"
      role="toolbar"
      aria-label="Chat controls"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          onMuteToggle();
          handleControlAction('mic', !isMicOn);
        }}
        aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
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