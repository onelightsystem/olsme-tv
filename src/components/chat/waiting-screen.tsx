"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const meditationPrompts = [
  "Take a deep breath, in and out.",
  "Notice the feeling of the ground beneath you.",
  "What sensations do you feel in your body right now?",
  "Allow your shoulders to relax away from your ears.",
  "Listen to the sounds around you without judgment.",
  "Bring a gentle smile to your face.",
];

type WaitingScreenProps = {
  onCancel: () => void;
};

export default function WaitingScreen({ onCancel }: WaitingScreenProps) {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    setPrompt(meditationPrompts[Math.floor(Math.random() * meditationPrompts.length)]);
  }, []);

  return (
    <Card className="w-full max-w-md text-center shadow-xl bg-card/80 backdrop-blur-sm">
      <CardContent className="p-8 flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-bold font-headline text-foreground mb-2">
          Finding a mindful connection...
        </h2>
        <p className="text-muted-foreground min-h-[40px] mb-8">
          {prompt}
        </p>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}
