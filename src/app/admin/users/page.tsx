// src/app/admin/users/page.tsx
// Date: Oct 5, 2025
// Description: Admin dashboard to view and manage users, their status, and verification levels.

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
import { ShieldAlert, Users, CircleDot } from 'lucide-react';

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

export default function AdminUsersPage() {
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
        if (tokenResult.claims.isAdmin) {
          setIsAdmin(true);
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
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const functions = getFunctions();
      const getAllUsers = httpsCallable(functions, 'getAllUsers');
      getAllUsers()
        .then((result: any) => {
          setAllUsers(result.data.users);
        })
        .catch((error) => {
          toast({
            variant: 'destructive',
            title: 'Error Fetching Users',
            description: error.message,
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isAdmin, toast]);

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
                {visibleColumns.package && <TableCell><Badge variant={user.package === 'premium' ? 'default' : 'secondary'}>{user.package}</Badge></TableCell>}
                {visibleColumns.verificationLevel && <TableCell>{verificationLevelText[user.verificationLevel]}</TableCell>}
                {visibleColumns.politeness && <TableCell>{avgPoliteness}</TableCell>}
                {visibleColumns.status && <TableCell><Badge variant={user.status === 'online' ? 'outline' : 'destructive'}>{user.status}</Badge></TableCell>}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-primary" /> Admin Dashboard
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
                <Users className="mr-2 h-4 w-4" /> All Users ({filteredUsers.all.length})
              </TabsTrigger>
              <TabsTrigger value="online">
                <CircleDot className="mr-2 h-4 w-4" /> Online Users ({filteredUsers.online.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                <ShieldAlert className="mr-2 h-4 w-4" /> Pending Verification ({filteredUsers.pending.length})
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
