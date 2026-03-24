'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { auth } from '@lib/firebase/config';
import Sidebar from '@components/admin/Sidebar';
import TopBar from '@components/admin/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
import { useToast } from '@hooks/use-toast';

type VerificationRow = {
  id: string;
  displayName: string;
  email: string;
  verificationLevel: 'level1' | 'level2' | 'level3';
  pendingLevel: 'level2' | 'level3' | null;
  createdAt: string | null;
};

const PAGE_SIZE = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'level1' | 'level2' | 'level3'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVerificationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const functions = getFunctions();
      const getVerificationQueue = httpsCallable<unknown, { users: Array<{
        id: string;
        displayName: string;
        email: string;
        verificationLevel: string;
        pendingVerificationLevel: string | null;
        createdAt: string | null;
      }> }>(functions, 'getVerificationQueue');
      const result = await getVerificationQueue({});
      const nextRows: VerificationRow[] = result.data.users.map((user) => {
        const level = (user.verificationLevel === 'level1' || user.verificationLevel === 'level2' || user.verificationLevel === 'level3'
          ? user.verificationLevel
          : 'level1') as 'level1' | 'level2' | 'level3';
        const pendingLevel =
          user.pendingVerificationLevel === 'level2' || user.pendingVerificationLevel === 'level3'
            ? (user.pendingVerificationLevel as 'level2' | 'level3')
            : level === 'level1'
              ? 'level2'
              : level === 'level2'
                ? 'level3'
                : null;
        return {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          verificationLevel: level,
          pendingLevel,
          createdAt: user.createdAt,
        };
      });
      nextRows.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setRows(nextRows);
    } catch {
      setRows([]);
      toast({ title: 'Failed to load', description: 'Could not fetch the verification queue. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVerificationQueue();
  }, [fetchVerificationQueue]);

  const filteredRows = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        row.displayName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (selectedLevel !== 'all' && row.verificationLevel !== selectedLevel) {
        return false;
      }

      if (!newArrivalsOnly) {
        return true;
      }

      const pending = row.pendingLevel !== null;
      const recent = row.createdAt ? now - new Date(row.createdAt).getTime() <= ONE_DAY_MS : false;
      return pending || recent;
    });
  }, [newArrivalsOnly, rows, searchQuery, selectedLevel]);

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
    return rows.filter((row) => {
      const pending = row.pendingLevel !== null;
      const recent = row.createdAt ? now - new Date(row.createdAt).getTime() <= ONE_DAY_MS : false;
      return pending || recent;
    }).length;
  }, [rows]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out', description: 'Admin session closed.' });
    router.push('/');
  };

  const exportCsvPlaceholder = () => {
    toast({ title: 'Export placeholder', description: 'CSV export will be connected in a backend pass.' });
  };

  const approvePlaceholder = (row: VerificationRow) => {
    const target = row.pendingLevel ?? (row.verificationLevel === 'level1' ? 'level2' : 'level3');
    toast({ title: 'Approval placeholder', description: `Approve ${row.displayName} for ${target} will be wired later.` });
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen">
        <Sidebar activeKey="verifications" mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

        <section className="flex min-h-screen flex-1 flex-col">
          <TopBar onOpenMenu={() => setMobileSidebarOpen(true)} onSignOut={handleSignOut} />

          <div className="space-y-5 p-4 sm:p-6">
            <Card className="rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-white">
                  <ShieldCheck className="h-5 w-5 text-[#FFD700]" />
                  Verifications
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Filter users by level and stage approval placeholders for Level 2 and Level 3.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search users by name, email, or Live ID..."
                    className="min-h-12 border-white/15 bg-black/25 text-white placeholder:text-gray-400"
                    aria-label="Search verification users"
                  />

                  <select
                    value={selectedLevel}
                    onChange={(event) => {
                      setSelectedLevel(event.target.value as 'all' | 'level1' | 'level2' | 'level3');
                      setCurrentPage(1);
                    }}
                    className="min-h-12 rounded-md border border-white/15 bg-black/25 px-3 text-sm text-white"
                    aria-label="Filter by verification level"
                  >
                    <option value="all">All Levels</option>
                    <option value="level1">Level 1</option>
                    <option value="level2">Level 2</option>
                    <option value="level3">Level 3</option>
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewArrivalsOnly((value) => !value);
                      setCurrentPage(1);
                    }}
                    className="min-h-12 border-white/20 bg-black/25 text-white"
                  >
                    {newArrivalsOnly ? 'Show All' : 'New Arrivals / Pending'}
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

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { void fetchVerificationQueue(); }}
                    className="min-h-12 border-white/20 bg-black/25 text-white"
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
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
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Current Level</TableHead>
                        <TableHead className="text-gray-300">Pending Request</TableHead>
                        <TableHead className="text-gray-300">Created</TableHead>
                        <TableHead className="text-gray-300 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-gray-400">Loading verifications...</TableCell>
                        </TableRow>
                      )}

                      {!loading && pagedRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-gray-400">No users found for the current filters.</TableCell>
                        </TableRow>
                      )}

                      {!loading && pagedRows.map((row) => (
                        <TableRow key={row.id} className="border-white/10">
                          <TableCell className="text-white">
                            <p className="font-semibold">{row.displayName}</p>
                            <p className="text-xs text-gray-400">{row.email}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className="border border-white/20 bg-white/[0.06] text-white uppercase">{row.verificationLevel}</Badge>
                          </TableCell>
                          <TableCell>
                            {row.pendingLevel ? (
                              <Badge className="border border-[#FFD700]/30 bg-[#FFD700]/15 text-[#FFE7A0] uppercase">{row.pendingLevel}</Badge>
                            ) : (
                              <span className="text-sm text-gray-400">No pending request</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-300">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Unknown'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              onClick={() => approvePlaceholder(row)}
                              className="min-h-12 bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
                            >
                              Approve {row.pendingLevel ?? (row.verificationLevel === 'level1' ? 'L2' : 'L3')}
                            </Button>
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
