'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Download, Users, UserPlus } from 'lucide-react';
import { auth } from '@lib/firebase/config';
import Sidebar from '@components/admin/Sidebar';
import TopBar from '@components/admin/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
import { useToast } from '@hooks/use-toast';

type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  package: string;
  verificationLevel: string;
  createdAt: string | null;
};

const PAGE_SIZE = 10;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type GetAllUsersResult = { users: Array<Record<string, unknown>> };

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const functions = getFunctions();
    const getAllUsers = httpsCallable<unknown, GetAllUsersResult>(functions, 'getAllUsers');

    getAllUsers()
      .then((result) => {
        const mapped = result.data.users.map((userData) => {
          return {
            id: typeof userData.id === 'string' ? userData.id : '',
            displayName: typeof userData.displayName === 'string' ? userData.displayName : 'Unknown user',
            email: typeof userData.email === 'string' ? userData.email : 'No email',
            package: typeof userData.package === 'string' ? userData.package : 'free',
            verificationLevel: typeof userData.verificationLevel === 'string' ? userData.verificationLevel : 'level1',
            createdAt: typeof userData.createdAt === 'string' ? userData.createdAt : null,
          } as AdminUser;
        });

        mapped.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        setUsers(mapped);
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setLoading(false);
      });
  }, []);

  const filteredUsers = useMemo(() => {
    const now = Date.now();
    const queryText = searchQuery.trim().toLowerCase();

    const next = users.filter((user) => {
      const matchesSearch =
        user.displayName.toLowerCase().includes(queryText) ||
        user.email.toLowerCase().includes(queryText) ||
        user.id.toLowerCase().includes(queryText);

      if (!matchesSearch) {
        return false;
      }

      if (!newArrivalsOnly) {
        return true;
      }

      if (!user.createdAt) {
        return false;
      }

      return now - new Date(user.createdAt).getTime() <= SEVEN_DAYS_MS;
    });

    return next;
  }, [newArrivalsOnly, searchQuery, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredUsers]);

  const newArrivalsCount = useMemo(() => {
    const now = Date.now();
    return users.filter((user) => user.createdAt && now - new Date(user.createdAt).getTime() <= SEVEN_DAYS_MS).length;
  }, [users]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out', description: 'Admin session closed.' });
    router.push('/');
  };

  const exportCsvPlaceholder = () => {
    toast({ title: 'Export placeholder', description: 'CSV export will be connected in a backend pass.' });
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen">
        <Sidebar activeKey="users" mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

        <section className="flex min-h-screen flex-1 flex-col">
          <TopBar onOpenMenu={() => setMobileSidebarOpen(true)} onSignOut={handleSignOut} />

          <div className="space-y-5 p-4 sm:p-6">
            <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-white">
                  <Users className="h-5 w-5 text-[#FFD700]" />
                  All Users
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Search all users, inspect recent arrivals, and review verification status.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search users by name, email, or Live ID..."
                    className="min-h-12 border-white/15 bg-black/25 text-white placeholder:text-gray-400"
                    aria-label="Search users"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewArrivalsOnly((value) => !value);
                      setCurrentPage(1);
                    }}
                    className="min-h-12 border-white/20 bg-black/25 text-white hover:border-[#FFD700]/35 hover:bg-black/35"
                  >
                    <UserPlus className="mr-2 h-4 w-4 text-[#FFD700]" />
                    {newArrivalsOnly ? 'Show All Users' : 'New Arrivals (7d)'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={exportCsvPlaceholder}
                    className="min-h-12 border-white/20 bg-black/25 text-white hover:border-[#FFD700]/35 hover:bg-black/35"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border border-[#FFD700]/30 bg-[#FFD700]/15 text-[#FFE7A0]">
                    New Arrivals: {newArrivalsCount}
                  </Badge>
                  <Badge className="border border-white/20 bg-white/[0.06] text-white">
                    Total Results: {filteredUsers.length}
                  </Badge>
                  <Badge className="border border-white/20 bg-white/[0.06] text-white">
                    Page {currentPage} of {totalPages}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Package</TableHead>
                        <TableHead className="text-gray-300">Verification</TableHead>
                        <TableHead className="text-gray-300">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-gray-400">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading && pagedUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-gray-400">
                            No users found for the current filters.
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading &&
                        pagedUsers.map((user) => (
                          <TableRow key={user.id} className="border-white/10">
                            <TableCell className="text-white">
                              <p className="font-semibold">{user.displayName}</p>
                              <p className="text-xs text-gray-400">{user.id}</p>
                            </TableCell>
                            <TableCell className="text-gray-200">{user.email}</TableCell>
                            <TableCell>
                              <Badge className="border border-white/20 bg-white/[0.06] text-white capitalize">{user.package}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="border border-[#FFD700]/30 bg-[#FFD700]/15 text-[#FFE7A0] uppercase">
                                {user.verificationLevel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="min-h-12 border-white/20 bg-black/25 text-white"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    className="min-h-12 border-white/20 bg-black/25 text-white"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
