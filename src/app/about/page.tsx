// Path: src/app/about/page.tsx
// Updated: Sept 30, 2025
// Description: About page for olsme.tv, describing it as a sub-social department under OneLightSystem (OLS) iee.aeo.
// - Highlights version 0.2 with signup/login for beta testing and free/premium options.
// - Incorporates content from https://www.olsme.com/olsme-tv.
// - Includes Firebase Firestore/IPFS logging for page visits.
// - Styled with #FFD700 gold, PT Sans, Radix UI (blueprint).
// - Aligns with freemium: Premium users ($4.99) see custom visuals/audio (Business Plan).
// - Solo Tip: Test with `npm run dev`, visit `/about`, check Firestore `logs`/`biofeedback_events`, IPFS CID.
'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Gem } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase/config';
import { logToIPFS } from '@/lib/ipfs-client';
import { triggerBiofeedback } from '@/lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export default function AboutPage() {
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

    // Log page visit
    const logVisit = async () => {
      try {
        const batch = writeBatch(db);
        batch.set(collection(db, 'logs').doc(), {
          userId: user?.uid || 'anonymous',
          context: 'about_page_visit',
          timestamp: new Date(),
        });
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId: user?.uid || 'anonymous',
          type: 'page_visit',
          value: 1,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          userId: user?.uid || 'anonymous',
          action: 'about_page_visit',
          premium: isPremium,
          timestamp: new Date().toISOString(),
        });

        // Mindfulness: Trigger calming audio for premium users
        if (user && isPremium) {
          await triggerBiofeedback(user.uid, 'chat', 'https://olsme.com/assets/premium-waves.mp3');
        }

        toast({
          title: 'Welcome to About olsme.tv',
          description: 'Discover our mindful mission!',
          id: 'about-visit',
          'aria-live': 'polite',
        });
      } catch (e: any) {
        const batch = writeBatch(db);
        batch.set(collection(db, 'logs').doc(), {
          userId: user?.uid || 'anonymous',
          context: 'about_page_error',
          error: e.message,
          timestamp: new Date(),
        });
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId: user?.uid || 'anonymous',
          type: 'error',
          value: 0,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          error: e.message,
          context: 'about_page_error',
          userId: user?.uid || 'anonymous',
          action: 'error',
          timestamp: new Date().toISOString(),
        });

        if (user) {
          await triggerBiofeedback(user.uid, 'chat');
        }
      }
    };

    logVisit();
  }, [user, isPremium, toast]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className={cn('shadow-xl bg-card/80 backdrop-blur-sm', isPremium && 'premium-video animate-premium-pulse')}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2 justify-center">
            <Sun className="h-8 w-8 text-primary" aria-hidden="true" />
            About olsme.tv
            {isPremium && <Gem className="h-6 w-6 text-primary" aria-hidden="true" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">Welcome to olsme.tv</h2>
            <p className="text-muted-foreground">
              olsme.tv is a radiant sub-social department under the OneLightSystem (OLS) iee.aeo, part of the OLS Meditation Education Academy. Inspired by Sun Light Meditation principles, we empower authentic, positive connections through a mindful video chat platform, liberated from the toxicity of traditional social media. In version 0.2, users can sign up and log in to join our beta testing, experiencing mindful chats with free and premium options.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">olsme.tv Beta 0.2 is Live!</h2>
            <p className="text-muted-foreground">
              The first version of olsme.tv (beta 0.2) is ready for beta testers! Sign up or log in to explore mindful video chats. Free users can enjoy basic features, while premium users ($4.99/month) unlock radiant enhancements like HD streams, custom audio prompts, and exclusive visuals. OneLightSystem OLS Chief Technology empowers this release with features designed to foster a Sun Light Civilization.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">Why Invest in olsme.tv?</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Conscious Connectivity:</strong> An empowering platform fostering authentic, positive interactions, aligned with Sun Light Meditation principles.
              </li>
              <li>
                <strong>AI-Driven Impact:</strong> Our luminous Social Spiritual Score (SSS) promotes kindness and personal growth, powered by privacy-first, on-device AI.
              </li>
              <li>
                <strong>Global Scalability:</strong> Built on Firebase, WebRTC, and Polygon for seamless access worldwide, even in restricted regions.
              </li>
              <li>
                <strong>Sun Light Vision:</strong> Infused with OLS meditation prompts and sunlight motifs, creating a transformative investor opportunity.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">Investment Opportunities</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Shape the Future:</strong> Invest in a platform that aligns with OLS’s mission for a global Sun Light Civilization.
              </li>
              <li>
                <strong>High-Growth Potential:</strong> Target 100K+ users within 3–6 months post-MVP, driving luminous returns.
              </li>
              <li>
                <strong>Series A Opportunity:</strong> Join early investors to fund scalable infrastructure and global outreach.
              </li>
              <li>
                <strong>Impactful Returns:</strong> Support a socially responsible platform transforming human connections.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">What's Next for olsme.tv?</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Beta Rollout:</strong> Luminous packages for initial users with enhanced AI moderation, meditation-integrated chats, and premium features.
              </li>
              <li>
                <strong>Feature Expansions:</strong> Tools like real-time Sun Light prompts and community events.
              </li>
              <li>
                <strong>Global Outreach:</strong> Radiant marketing to attract investors and users.
              </li>
              <li>
                <strong>Continuous Improvement:</strong> Iterative updates based on feedback to remain a beacon of positive social media.
              </li>
            </ul>
          </section>
          <section className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Join the Sun Light Civilization!</h2>
            <p className="text-muted-foreground mb-4">
              Sign up today to join our beta testing, or become an OLS investor to support our empowering journey to revolutionize mindful social media with Sun Light Meditation.
            </p>
            <Button asChild size="lg" className="animate-gentle-pulse">
              <Link href="https://www.olsme.com/contact" target="_blank" rel="noopener noreferrer">
                Contact Us
              </Link>
            </Button>
            {!user && (
              <Button asChild size="lg" className="ml-4 animate-gentle-pulse" variant="outline">
                <Link href="/login">Join Beta Testing</Link>
              </Button>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}