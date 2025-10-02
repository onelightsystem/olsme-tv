// Path: src/app/admin/users/page.tsx
// Improvements (Sept 30, 2025):
// - Added premium user check for enhanced visuals (freemium model, $4.99/month).
// - Added IPFS logging for admin actions (anti-censorship).
// - Added biofeedback audio trigger for admin actions (OLS mindfulness).
// - Optimized Firestore writes with batching and retry logic.
// - Enhanced ARIA attributes for accessibility (GDPR compliance).
// - Aligned with blueprint: Admin dashboard, Firebase Cloud Functions, IPFS logging.
// - Solo Tip: Test with `npm run dev`, visit `/admin/users` as admin, check Firestore `logs`/`biofeedback_events`, IPFS CID.
'use client';
import { useEffect, useState, useMemo } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { User as FirebaseUser } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Users, CircleDot, Gem } from 'lucide-react';
import { logToIPFS } from '@/lib/ipfs-client';
import { triggerBiofeedback, formatErrorLog } from '@/lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type UserData = {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  package: 'free' | 'premium';
  verificationLevel: 'level1' | 'level2' | 'level3';
  politenessScore: { ethical: number; communication: number; listener: number; topics: number };
  olsPoints: number;
  location?: string;
  age?: number;
  createdAt: string;
  status: 'online' | 'offline';
};

const verificationLevelText = {
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

export default function AdminUsersPage() {
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    uid: true,
    displayName: true,
    email: true,
    package: true,
    verificationLevel: true,
    politeness: true,
    status: true,
    createdAt: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setAdminUser(user);
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
        if (tokenResult.claims.isAdmin) {
          setIsAdmin(true);
          try {
            const batch = writeBatch(db);
            batch.set(collection(db, 'logs').doc(), {
              userId: user.uid,
              context: 'admin_dashboard_access',
              timestamp: new Date(),
            });
            batch.set(collection(db, 'biofeedback_events').doc(), {
              userId: user.uid,
              type: 'admin_access',
              value: 1,
              timestamp: new Date(),
            });
            await withFirestoreRetry(() => batch.commit());

            await logToIPFS({
              userId: user.uid,
              action: 'admin_dashboard_access',
              premium: isPremium,
              timestamp: new Date().toISOString(),
            });

            // Mindfulness: Trigger calming audio for premium users
            if (isPremium) {
              await triggerBiofeedback(user.uid, 'chat', 'https://olsme.com/assets/premium-waves.mp3');
            }
          } catch (e: any) {
            const batch = writeBatch(db);
            batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'admin_dashboard_access', user.uid));
            batch.set(collection(db, 'biofeedback_events').doc(), {
              userId: user.uid,
              type: 'error',
              value: 0,
              timestamp: new Date(),
            });
            await withFirestoreRetry(() => batch.commit());

            await logToIPFS({
              error: e.message,
              context: 'admin_dashboard_access',
              userId: user.uid,
              action: 'error',
              timestamp: new Date().toISOString(),
            });

            await triggerBiofeedback(user.uid, 'chat');
          }
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [isPremium]);

  useEffect(() => {
    if (isAdmin) {
      const functions = getFunctions();
      const getAllUsers = httpsCallable(functions, 'getAllUsers');
      getAllUsers()
        .then((result: any) => {
          setAllUsers(result.data.users);
        })
        .catch((error: any) => {
          const batch = writeBatch(db);
          batch.set(collection(db, 'logs').doc(), formatErrorLog(error, 'getAllUsers', adminUser?.uid || 'anonymous'));
          batch.set(collection(db, 'biofeedback_events').doc(), {
            userId: adminUser?.uid || 'anonymous',
            type: 'error',
            value: 0,
            timestamp: new Date(),
          });
          withFirestoreRetry(() => batch.commit());

          logToIPFS({
            error: error.message,
            context: 'getAllUsers',
            userId: adminUser?.uid || 'anonymous',
            action: 'error',
            timestamp: new Date().toISOString(),
          });

          toast({
            variant: 'destructive',
            title: 'Error Fetching Users',
            description: error.message,
            id: 'fetch-users-error',
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isAdmin, toast, adminUser]);

  const filteredUsers = useMemo(() => {
    const onlineUsers = allUsers.filter(u => u.status === 'online');
    const pendingVerification = allUsers.filter(u => u.verificationLevel !== 'level3');
    const filterText = filter.toLowerCase();
    const applyFilter = (users: UserData[]) => users.filter(user =>
      user.displayName?.toLowerCase().includes(filterText) ||
      user.email?.toLowerCase().includes(filterText) ||
      user.uid.toLowerCase().includes(filterText)
    );
    return {
      all: applyFilter(allUsers),
      online: applyFilter(onlineUsers),
      pending: applyFilter(pendingVerification),
    };
  }, [allUsers, filter]);

  const renderUserTable = (users: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          {visibleColumns.uid && <TableHead>UID</TableHead>}
          {visibleColumns.displayName && <TableHead>Display Name</TableHead>}
          {visibleColumns.email && <TableHead>Email</TableHead>}
          {visibleColumns.package && <TableHead>Package</TableHead>}
          {visibleColumns.verificationLevel && <TableHead>Verification</TableHead>}
          {visibleColumns.politeness && <TableHead>Politeness</TableHead>}
          {visibleColumns.status && <TableHead>Status</TableHead>}
          {visibleColumns.createdAt && <TableHead>Created At</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length > 0 ? (
          users.map((user) => {
            const avgPoliteness = Math.round((user.politenessScore.ethical + user.politenessScore.communication + user.politenessScore.listener + user.politenessScore.topics) / 4);
            return (
              <TableRow key={user.uid}>
                {visibleColumns.uid && <TableCell className="font-mono text-xs">{user.uid}</TableCell>}
                {visibleColumns.displayName && <TableCell>{user.displayName}</TableCell>}
                {visibleColumns.email && <TableCell>{user.email}</TableCell>}
                {visibleColumns.package && (
                  <TableCell>
                    <Badge variant={user.package === 'premium' ? 'default' : 'secondary'}>
                      {user.package}
                      {user.package === 'premium' && <Gem className="ml-1 h-4 w-4" aria-hidden="true" />}
                    </Badge>
                  </TableCell>
                )}
                {visibleColumns.verificationLevel && <TableCell>{verificationLevelText[user.verificationLevel]}</TableCell>}
                {visibleColumns.politeness && <TableCell>{avgPoliteness}</TableCell>}
                {visibleColumns.status && (
                  <TableCell>
                    <Badge variant={user.status === 'online' ? 'outline' : 'destructive'}>{user.status}</Badge>
                  </TableCell>
                )}
                {visibleColumns.createdAt && <TableCell>{format(new Date(user.createdAt), 'PPpp')}</TableCell>}
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="h-24 text-center">
              No users found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return <div className="container mx-auto p-4"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className={cn('shadow-xl bg-card/80 backdrop-blur-sm', isPremium && 'premium-video animate-premium-pulse')}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-primary" aria-hidden="true" />
            Admin Dashboard
            {isPremium && <Gem className="h-6 w-6 text-primary" aria-hidden="true" />}
          </CardTitle>
          <CardDescription>Manage users, verification, and system status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Input
              placeholder="Filter users by name, email, or UID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
              aria-label="Filter users"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.keys(visibleColumns).map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    className="capitalize"
                    checked={visibleColumns[key]}
                    onCheckedChange={(value) => setVisibleColumns(prev => ({ ...prev, [key]: !!value }))}
                  >
                    {key}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                <Users className="mr-2 h-4 w-4" aria-hidden="true" /> All Users ({filteredUsers.all.length})
              </TabsTrigger>
              <TabsTrigger value="online">
                <CircleDot className="mr-2 h-4 w-4" aria-hidden="true" /> Online Users ({filteredUsers.online.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" /> Pending Verification ({filteredUsers.pending.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">{renderUserTable(filteredUsers.all)}</TabsContent>
            <TabsContent value="online">{renderUserTable(filteredUsers.online)}</TabsContent>
            <TabsContent value="pending">{renderUserTable(filteredUsers.pending)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}