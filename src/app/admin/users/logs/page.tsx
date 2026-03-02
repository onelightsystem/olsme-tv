
// Path: src/app/admin/logs/page.tsx
// Improvements (Oct 12, 2025):
// - Created admin dashboard to visualize Firestore logs using recharts for solo debugging.
// - Displays log counts by action, level, and mindfulness context in a bar chart.
// - Filters logs by correlation ID for tracing specific user actions.
// - Ensures admin-only access via isAdmin claim check.
// - Aligns with OLS mindfulness: Highlights mindfulness-related logs.
// - Solo Tip: Test with `npm run dev`, visit /admin/logs, check Firestore `logs` and `biofeedback_events`.
'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { auth, db } from '@lib/firebase/config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { onAuthStateChanged } from 'firebase/auth';
import { formatErrorLog, generateCorrelationId } from '@lib/utils';

interface Log {
  userId: string;
  action: string;
  level: 'info' | 'error';
  correlationId: string;
  mindfulness?: string;
  timestamp: { toDate: () => Date };
}

/**
 * Admin dashboard for visualizing Firestore logs.
 * @returns JSX element rendering a bar chart and correlation ID filter.
 */
export default function LogsDashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [correlationIdFilter, setCorrelationIdFilter] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdTokenResult();
        setIsAdmin(!!idToken.claims.isAdmin);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logsQuery = correlationIdFilter
          ? query(collection(db, 'logs'), where('correlationId', '==', correlationIdFilter))
          : collection(db, 'logs');
        const snapshot = await getDocs(logsQuery);
        const fetchedLogs = snapshot.docs.map(doc => doc.data() as Log);
        setLogs(fetchedLogs);
      } catch (e: unknown) {
        const correlationId = generateCorrelationId();
        await addDoc(collection(db, 'logs'), formatErrorLog(e, 'fetchLogs', 'admin', correlationId));
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch logs.', id: 'fetch-logs-error' });
      }
    };
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, correlationIdFilter, toast]);

  const chartData = logs.reduce((acc, log) => {
    const action = log.mindfulness || log.action;
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formattedChartData = Object.entries(chartData).map(([action, count]) => ({ action, count }));

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be an admin to view logs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Logs Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Filter by Correlation ID"
              value={correlationIdFilter}
              onChange={(e) => setCorrelationIdFilter(e.target.value)}
              className="max-w-sm"
              aria-label="Filter logs by correlation ID"
            />
          </div>
          <BarChart width={600} height={300} data={formattedChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="action" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </CardContent>
      </Card>
    </div>
  );
}