// Path: src/app/search/page.tsx
// Date: Oct 4, 2025
// Description: User search page to find other users by display name and verification level.

'use client';

import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, ShieldCheck, Gem } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { logToIPFS, formatErrorLog } from '@/lib/utils';
import { auth, db } from '@/lib/firebase/config';
import { collection, addDoc } from 'firebase/firestore';

type SearchResult = {
  uid: string;
  displayName: string;
  package: 'free' | 'premium';
  verificationLevel: 'level1' | 'level2' | 'level3';
};

const verificationLevelText = {
  level1: 'Level 1',
  level2: 'Level 2',
  level3: 'Level 3',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [verificationLevel, setVerificationLevel] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to search.' });
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
      const response: any = await searchUsers({ query, verificationLevel });
      setResults(response.data.users);
      
      await logToIPFS({
        userId: auth.currentUser.uid,
        action: 'user_search',
        query,
        verificationLevel
      });

    } catch (error) {
      console.error("Search failed:", error);
      toast({ variant: 'destructive', title: 'Search Error', description: 'An unexpected error occurred.' });
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'searchPage'));
    } finally {
      setLoading(false);
    }
  }, [query, verificationLevel, toast]);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2 justify-center">
            <Search className="h-8 w-8 text-primary" /> User Search
          </CardTitle>
          <CardDescription className="text-center">Find and connect with other mindful users.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-6">
            <Input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow"
            />
            <Select value={verificationLevel} onValueChange={setVerificationLevel}>
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
            <Button type="submit" disabled={loading}>
              <Search className="mr-2 h-4 w-4" /> Search
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
                <div key={user.uid} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                    <div className="flex items-center gap-4">
                         <div className="bg-muted rounded-full p-2">
                             <User className="h-8 w-8 text-muted-foreground" />
                         </div>
                        <div>
                            <p className="font-semibold">{user.displayName}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Gem className="h-4 w-4" /> {user.package}
                                </span>
                                <span className="flex items-center gap-1">
                                    <ShieldCheck className="h-4 w-4" /> {verificationLevelText[user.verificationLevel]}
                                </span>
                            </div>
                        </div>
                    </div>
                     <Button variant="outline" size="sm">
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
