'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  console.error('[admin-error-boundary]', error);

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-3xl border border-red-500/30 bg-[rgba(17,17,17,0.88)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-white">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              Admin access denied
            </CardTitle>
            <CardDescription className="text-gray-300">
              Something went wrong while loading this admin route. Your session was protected.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={reset}
              className="min-h-12 bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
            >
              Try again
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              className="min-h-12 border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
