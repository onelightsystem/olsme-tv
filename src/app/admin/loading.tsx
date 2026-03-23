import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#070707] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto flex max-w-2xl items-center justify-center rounded-3xl border border-white/10 bg-[rgba(17,17,17,0.82)] p-10 backdrop-blur-xl">
        <div className="flex items-center gap-3 text-lg text-gray-200">
          <Loader2 className="h-6 w-6 animate-spin text-[#FFD700]" />
          Loading admin panel...
        </div>
      </div>
    </main>
  );
}
