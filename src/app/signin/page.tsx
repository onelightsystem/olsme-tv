'use client';

import Link from 'next/link';
import { Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-xl">
        <Card className="rounded-3xl border border-white/10 bg-[rgba(17,17,17,0.82)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-white">
              <Sun className="h-5 w-5 text-[#FFD700]" />
              Sign in required
            </CardTitle>
            <CardDescription className="text-gray-300">
              Please sign in first, then reopen the admin route if your account has admin access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              asChild
              className="min-h-12 bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F]"
            >
              <Link href="/">Go to Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-12 border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <Link href="/about">Learn more</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
