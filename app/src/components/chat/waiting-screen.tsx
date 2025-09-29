// Path: src/components/chat/waiting-screen.tsx
// Improvements (Sept 28, 2025):
// - Kept meditation prompts, Card UI, #FFD700 gold, PT Sans (done, blueprint, Day 4).
// - Kept OLS imagery, biofeedback audio, Firestore logging (done, Day 2/11).
// - Fixed import: Ensured `@hooks/use-mobile` (new, resolves console error).
// - Added WebRTC signaling mock for match feedback (new, Day 4).
// - Added IPFS logging for prompts (new, Day 4).
// - Aligns with freemium: Premium users ($4.99) unlock custom prompts/images (Business Plan).
// - Solo Tip: Test with `npm run dev`, visit `localhost:9002/wait`, check Firestore `biofeedback`/`image_logs`, IPFS CID.

'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Sun } from 'lucide-react';
import { OlsImages, logImageLoad, validateImageUrl } from '@lib/placeholder-images';
import { triggerBiofeedback, logToIPFS } from '@utils';
import { useToast } from '@hooks/use-toast';
import { useIsMobile } from '@hooks/use-mobile';
import { cn } from '@utils';

const meditationPrompts = [
  'Take a deep breath, in and out.',
  'Notice the feeling of the ground beneath you.',
  'What sensations do you feel in your body right now?',
  'Allow your shoulders to relax away from your ears.',
  'Listen to the sounds around you without judgment.',
  'Bring a gentle smile to your face.',
];

type WaitingScreenProps = {
  onCancel: () => void;
  userId: string;
};

export default function WaitingScreen({ onCancel, userId }: WaitingScreenProps) {
  const [prompt, setPrompt] = useState('Initializing...');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Set a random prompt only on the client-side to avoid hydration errors.
    const selectedPrompt = meditationPrompts[Math.floor(Math.random() * meditationPrompts.length)];
    setPrompt(selectedPrompt);

    triggerBiofeedback(userId, 'wait')
      .then(() => {
        toast({
          title: 'Meditation Prompt',
          description: selectedPrompt,
        });
        logToIPFS({ prompt: selectedPrompt, userId }); // IPFS (Day 4)
      })
      .catch((e) => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to play biofeedback audio.' });
      });
      
    validateImageUrl(OlsImages[0].imageUrl).then((valid) => {
      if (valid) logImageLoad(OlsImages[0].id, 'waiting-screen');
      else toast({ variant: 'destructive', title: 'Error', description: 'Failed to load OLS image.' });
    });

    // Mock WebRTC signaling (Day 4)
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/match');
        const data = await res.json();
        if (data.match) {
          toast({ title: 'Match Found', description: 'Connecting you now...' });
          logToIPFS({ match: data.match, userId }); // IPFS
        }
      } catch (e) {
        // This is a mock API, so we can ignore fetch errors in the console for now.
      }
    }, 5000);
    
    return () => clearInterval(poll);
  }, [userId, toast]);

  return (
    <Card
      className={cn(
        'w-full max-w-md text-center shadow-xl bg-card/80 backdrop-blur-sm',
        isMobile ? 'p-4' : 'p-8'
      )}
    >
      <CardContent className="p-8 flex flex-col items-center">
        <Sun className="h-12 w-12 stroke-[#FFD700] fill-none animate-loading-sun mb-6" />
        <h2 className="text-2xl font-bold font-headline text-foreground mb-2">
          Finding a mindful connection...
        </h2>
        <p className="text-muted-foreground min-h-[40px] mb-4">{prompt}</p>
        <img
          src={OlsImages[0].imageUrl}
          alt={OlsImages[0].description}
          className="mb-4 rounded-lg max-w-full h-auto"
        />
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}
