// Path: src/app/search/page.tsx
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added premium user check for enhanced search visuals (freemium model, $4.99/month).
// - Added biofeedback audio trigger for search actions (OLS mindfulness).
// - Enhanced error handling with `userId` in logs for traceability.
// - Optimized Firestore writes with batching for efficiency.
// - Added ARIA attributes for accessibility (GDPR compliance).
// - Aligned with blueprint: AI politeness, Firebase Cloud Functions, IPFS logging.
// - Solo Tip: Test with `npm run dev`, visit `/search`, check Firestore `logs`/`biofeedback_events`, IPFS CID.
'use client';
import { useState, useCallback, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { useToast } from '@hooks/use-toast';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Search, User, ShieldCheck, Gem } from 'lucide-react';
import { Skeleton } from '@components/ui/skeleton';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback, formatErrorLog } from '@lib/utils';
import { auth, db } from '@lib/firebase/config';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { debounce } from 'lodash';
import { cn } from '@lib/utils';

interface SearchResult {
  uid: string;
  displayName: string;
  package: 'free' | 'premium';
  verificationLevel: 'level1' | 'level2' | 'level3';
}

interface SearchResponse {
  users: SearchResult[];
}

const verificationLevelText: Record<string, string> = {
  level1: 'Level 1',
  level2: 'Level 2',
  level3: 'Level 3',
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

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [verificationLevel, setVerificationLevel] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Wait for Firebase Auth to initialize
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
      } else {
        setIsPremium(false);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Debounced search function
  const handleSearch = useCallback(
    debounce(async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!auth.currentUser) {
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'You must be logged in to search.',
          id: 'auth-error',
        });
        return;
      }
      if (!query.trim() && verificationLevel === 'all') {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const functions = getFunctions();
        const searchUsers = httpsCallable(functions, 'searchUsers');
        const response = (await searchUsers({ query, verificationLevel })) as { data: SearchResponse };
        setResults(response.data.users);

        // Batch Firestore writes
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'logs')), {
          userId: auth.currentUser.uid,
          context: 'user_search',
          query,
          verificationLevel,
          timestamp: new Date(),
        });
        batch.set(doc(collection(db, 'biofeedback_events')), {
          userId: auth.currentUser.uid,
          type: 'search_action',
          value: 1,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          userId: auth.currentUser.uid,
          action: 'user_search',
          query,
          verificationLevel,
          timestamp: new Date().toISOString(),
        });

        // Mindfulness: Trigger calming audio
        await triggerBiofeedback(auth.currentUser.uid, 'chat', isPremium ? 'https://olsme.com/assets/premium-waves.mp3' : undefined);

        toast({
          title: 'Search Complete',
          description: `Found ${response.data.users.length} users.`,
          id: 'search-complete',
        });
      } catch (error: any) {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'logs')), formatErrorLog(error, 'searchPage', auth.currentUser.uid));
        batch.set(doc(collection(db, 'biofeedback_events')), {
          userId: auth.currentUser.uid,
          type: 'error',
          value: 0,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          error: error.message,
          context: 'searchPage',
          userId: auth.currentUser.uid,
          action: 'error',
          timestamp: new Date().toISOString(),
        });

        await triggerBiofeedback(auth.currentUser.uid, 'chat');

        toast({
          variant: 'destructive',
          title: 'Search Error',
          description: 'An unexpected error occurred.',
          id: 'search-error',
        });
      } finally {
        setLoading(false);
      }
    }, 300),
    [query, verificationLevel, toast, isPremium]
  );

  // Handle form submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // Navigate to user profile
  const viewProfile = (uid: string) => {
    router.push(`/profile/${uid}`);
  };

  if (!authReady) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className={cn('shadow-xl bg-card/80 backdrop-blur-sm', isPremium && 'premium-video animate-premium-pulse')}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2 justify-center">
            <Search className="h-8 w-8 text-primary" aria-hidden="true" />
            User Search
            {isPremium && <Gem className="h-6 w-6 text-primary" aria-hidden="true" />}
          </CardTitle>
          <CardDescription className="text-center">
            Find and connect with other mindful users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 mb-6" role="search">
            <Input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow"
              aria-label="Search by user name"
            />
            <Select value={verificationLevel} onValueChange={setVerificationLevel} aria-label="Filter by verification level">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Verification Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="level1">Level 1</SelectItem>
                <SelectItem value="level2">Level 2</SelectItem>
                <SelectItem value="level3">Level 3</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading} aria-label="Search users">
              <Search className="mr-2 h-4 w-4" aria-hidden="true" /> Search
            </Button>
          </form>
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))
            ) : results.length > 0 ? (
              results.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
                  role="listitem"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-full p-2">
                      <User className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold">{user.displayName}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gem className="h-4 w-4" aria-hidden="true" /> {user.package}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />{' '}
                          {verificationLevelText[user.verificationLevel]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewProfile(user.uid)}
                    aria-label={`View profile of ${user.displayName}`}
                  >
                    View Profile
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No users found. Try a different search.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}