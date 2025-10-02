// Path: src/components/chat/waiting-screen.tsx
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added premium user check for custom prompts/images (freemium model, $4.99/month).
// - Added biofeedback audio triggers for errors and prompts (OLS mindfulness).
// - Enhanced error handling with `userId` and action context in logs for traceability.
// - Removed non-existent `/api/match` call, replaced with mock logic.
// - Added batch Firestore writes and retry logic for performance.
// - Added ARIA attributes for accessibility (GDPR compliance).
// - Styled with #FFD700 gold, PT Sans, and premium animation (blueprint).
// - Aligns with blueprint: Meditation prompts, WebRTC signaling, IPFS logging.
// - Solo Tip: Test with `npm run dev`, visit `localhost:9002`, start chat, check Firestore `biofeedback_events`/`image_logs`/`logs`, IPFS CID.
'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Sun } from 'lucide-react';
import { OlsImages, logImageLoad, validateImageUrl } from '@/lib/placeholder-images';
import { triggerBiofeedback } from '@/lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { useToast } from '@hooks/use-toast';
import { useIsMobile } from '@hooks/use-mobile';
import { cn } from '@lib/utils';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';

const meditationPrompts = [
  'Take a deep breath, in and out.',
  'Notice the feeling of the ground beneath you.',
  'What sensations do you feel in your body right now?',
  'Allow your shoulders to relax away from your ears.',
  'Listen to the sounds around you without judgment.',
  'Bring a gentle smile to your face.',
];

// Premium-specific prompts
const premiumPrompts = [
  'Embrace the light within as you connect.',
  'Visualize a golden sunrise calming your mind.',
  'Feel the harmony of this mindful moment.',
];

type WaitingScreenProps = {
  onCancel: () => void;
  userId: string;
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

export default function WaitingScreen({ onCancel, userId }: WaitingScreenProps) {
  const [prompt, setPrompt] = useState('Initializing...');
  const [isPremium, setIsPremium] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);

    // Check for premium user
    getDoc(doc(db, 'users', userId)).then((userDoc) => {
      setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
    });

    // Set random prompt
    const prompts = isPremium ? premiumPrompts : meditationPrompts;
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setPrompt(selectedPrompt);

    const logPrompt = async () => {
      try {
        // Batch Firestore writes
        const batch = writeBatch(db);
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId,
          type: 'audio_wait',
          value: 1,
          timestamp: new Date(),
        });
        batch.set(collection(db, 'logs').doc(), {
          userId,
          context: 'waiting-screen',
          prompt: selectedPrompt,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        // Log to IPFS
        await logToIPFS({
          userId,
          action: 'waiting_prompt',
          prompt: selectedPrompt,
          timestamp: new Date().toISOString(),
        });

        // Mindfulness: Trigger calming audio
        await triggerBiofeedback(userId, 'wait', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);

        toast({
          title: 'Meditation Prompt',
          description: selectedPrompt,
          id: 'waiting-prompt',
        });
      } catch (e: any) {
        const batch = writeBatch(db);
        batch.set(collection(db, 'logs').doc(), {
          userId,
          context: 'waiting-screen',
          error: e.message,
          timestamp: new Date(),
        });
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId,
          type: 'error',
          value: 0,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          error: e.message,
          context: 'waiting-screen',
          userId,
          action: 'error',
          timestamp: new Date().toISOString(),
        });

        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load meditation prompt or audio.',
          id: 'waiting-error',
        });
      }
    };

    logPrompt();

    // Validate and log image
    validateImageUrl(OlsImages[0].imageUrl).then(async (valid) => {
      try {
        if (valid) {
          await logImageLoad(OlsImages[0].id, 'waiting-screen');
          await logToIPFS({
            userId,
            action: 'image_load',
            imageId: OlsImages[0].id,
            context: 'waiting-screen',
            timestamp: new Date().toISOString(),
          });
        } else {
          throw new Error('Invalid OLS image URL');
        }
      } catch (e: any) {
        const batch = writeBatch(db);
        batch.set(collection(db, 'logs').doc(), {
          userId,
          context: 'waiting-screen',
          error: e.message,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          error: e.message,
          context: 'waiting-screen',
          userId,
          action: 'error',
          timestamp: new Date().toISOString(),
        });

        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load OLS image.',
          id: 'image-error',
        });
      }
    });

    // Mock WebRTC signaling
    const poll = setInterval(() => {
      // Simulate match (replace with real WebRTC signaling in Month 2)
      const mockMatch = { matchId: `mock-${Date.now()}`, status: 'connected' };
      toast({
        title: 'Match Found',
        description: 'Connecting you now...',
        id: 'match-found',
      });
      logToIPFS({
        userId,
        action: 'mock_match',
        match: mockMatch,
        timestamp: new Date().toISOString(),
      });
    }, 5000);

    return () => clearInterval(poll);
  }, [userId, toast, isPremium]);

  // Only render mobile-dependent class name on the client
  const cardClassName = cn(
    'w-full max-w-md text-center shadow-xl bg-card/80 backdrop-blur-sm',
    isMobile ? 'p-4' : 'p-8',
    isPremium && 'premium-video animate-premium-pulse' // Premium styling
  );

  return (
    <Card className={cardClassName} role="region" aria-label="Waiting screen" aria-live="polite">
      <CardContent className="p-8 flex flex-col items-center">
        <Sun className="h-12 w-12 stroke-[#FFD700] fill-none animate-loading-sun mb-6" aria-hidden="true" />
        <h2 className="text-2xl font-bold font-headline text-foreground mb-2">
          Finding a mindful connection...
        </h2>
        <p className="text-muted-foreground min-h-[40px] mb-4">{prompt}</p>
        {isClient && (
          <img
            src={isPremium ? 'https://olsme.com/assets/premium-image.jpg' : OlsImages[0].imageUrl}
            alt={isPremium ? 'Premium mindful image' : OlsImages[0].description}
            className="mb-4 rounded-lg max-w-full h-auto"
            aria-describedby="image-description"
          />
        )}
        <span id="image-description" className="sr-only">
          {isPremium ? 'A premium mindful image to enhance your waiting experience.' : OlsImages[0].description}
        </span>
        <Button variant="outline" onClick={onCancel} aria-label="Cancel waiting">
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}