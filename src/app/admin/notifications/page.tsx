'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { Bell, Download } from 'lucide-react';
import { auth, db } from '@lib/firebase/config';
import Sidebar from '@components/admin/Sidebar';
import TopBar from '@components/admin/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
import { useToast } from '@hooks/use-toast';

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  targetUsers: string;
  createdAt: string | null;
};

const PAGE_SIZE = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') {
      return toDate();
    }
  }
  return null;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetUsers, setTargetUsers] = useState('All Users');

  useEffect(() => {
    const notificationsQuery = query(collection(db, 'notifications'), limit(250));
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const nextRows = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const created = parseDate(data.createdAt ?? data.timestamp);
          return {
            id: docSnap.id,
            title: typeof data.title === 'string' ? data.title : 'Untitled notification',
            message: typeof data.message === 'string' ? data.message : '',
            targetUsers: typeof data.targetUsers === 'string' ? data.targetUsers : 'All Users',
            createdAt: created ? created.toISOString() : null,
          } as NotificationRow;
        });

        nextRows.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        setRows(nextRows);
        setLoading(false);
      },
      () => {
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredRows = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matches =
        row.title.toLowerCase().includes(q) ||
        row.message.toLowerCase().includes(q) ||
        row.targetUsers.toLowerCase().includes(q);

      if (!matches) return false;
      if (!newArrivalsOnly) return true;
      if (!row.createdAt) return false;
      return now - new Date(row.createdAt).getTime() <= ONE_DAY_MS;
    });
  }, [newArrivalsOnly, rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  const newArrivalsCount = useMemo(() => {
    const now = Date.now();
    return rows.filter((row) => row.createdAt && now - new Date(row.createdAt).getTime() <= ONE_DAY_MS).length;
  }, [rows]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out', description: 'Admin session closed.' });
    router.push('/');
  };

  const handleComposePlaceholder = () => {
    if (!title.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Add title and message before sending.' });
      return;
    }

    toast({
      title: 'Notification placeholder',
      description: `"${title.trim()}" will be sent to ${targetUsers} once backend wiring is enabled.`,
    });

    setTitle('');
    setMessage('');
    setTargetUsers('All Users');
  };

  const exportCsvPlaceholder = () => {
    toast({ title: 'Export placeholder', description: 'CSV export will be connected in a backend pass.' });
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen">
        <Sidebar activeKey="notifications" mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

        <section className="flex min-h-screen flex-1 flex-col">
          <TopBar onOpenMenu={() => setMobileSidebarOpen(true)} onSignOut={handleSignOut} />

          <div className="space-y-5 p-4 sm:p-6">
            <Card className="rounded-3xl border border-[#FFD700]/25 bg-[rgba(17,17,17,0.8)] backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-white">
                  <Bell className="h-5 w-5 text-[#FFD700]" />
                  Notification Composer
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Compose global notifications and target the right audience segment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Notification title"
                  className="min-h-12 border-white/15 bg-black/25 text-white placeholder:text-gray-400"
                  aria-label="Notification title"
                />

                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Notification message"
                  className="min-h-28 border-white/15 bg-black/25 text-white placeholder:text-gray-400"
                  aria-label="Notification message"
                />

                <select
                  value={targetUsers}
                  onChange={(event) => setTargetUsers(event.target.value)}
                  className="min-h-12 rounded-md border border-white/15 bg-black/25 px-3 text-sm text-white"
                  aria-label="Target users"
                >
                  <option>All Users</option>
                  <option>Premium Users</option>
                  <option>Entry + Starter Users</option>
                  <option>Pending Verification Users</option>
                </select>

                <Button
                  type="button"
                  onClick={handleComposePlaceholder}
                  className="min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
                >
                  Send Notification (Placeholder)
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-xl text-white">Sent Notifications</CardTitle>
                <CardDescription className="text-gray-300">
                  Search notification history and inspect target audience details.
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
                    placeholder="Search by title, message, or target users..."
                    className="min-h-12 border-white/15 bg-black/25 text-white placeholder:text-gray-400"
                    aria-label="Search notifications"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewArrivalsOnly((value) => !value);
                      setCurrentPage(1);
                    }}
                    className="min-h-12 border-white/20 bg-black/25 text-white"
                  >
                    {newArrivalsOnly ? 'Show All Notifications' : 'New Arrivals (24h)'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={exportCsvPlaceholder}
                    className="min-h-12 border-white/20 bg-black/25 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border border-[#FFD700]/30 bg-[#FFD700]/15 text-[#FFE7A0]">New Arrivals: {newArrivalsCount}</Badge>
                  <Badge className="border border-white/20 bg-white/[0.06] text-white">Total Results: {filteredRows.length}</Badge>
                  <Badge className="border border-white/20 bg-white/[0.06] text-white">Page {currentPage} of {totalPages}</Badge>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-gray-300">Title</TableHead>
                        <TableHead className="text-gray-300">Message</TableHead>
                        <TableHead className="text-gray-300">Target Users</TableHead>
                        <TableHead className="text-gray-300">Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-gray-400">Loading notifications...</TableCell>
                        </TableRow>
                      )}

                      {!loading && pagedRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-gray-400">No notifications found for the current filters.</TableCell>
                        </TableRow>
                      )}

                      {!loading && pagedRows.map((row) => (
                        <TableRow key={row.id} className="border-white/10">
                          <TableCell className="text-white">{row.title}</TableCell>
                          <TableCell className="max-w-md text-gray-200">{row.message}</TableCell>
                          <TableCell>
                            <Badge className="border border-white/20 bg-white/[0.06] text-white">{row.targetUsers}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">{row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Unknown'}</TableCell>
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
