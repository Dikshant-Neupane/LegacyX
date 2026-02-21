'use client';

import Link from 'next/link';

export default function PlaceholderPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="font-display text-3xl mb-4 text-vault-text">Identity Proof</h1>
      <p className="text-vault-muted mb-8">Coming soon in the next update.</p>
      <Link href="/" className="btn-ghost">Back to Home</Link>
    </div>
  );
}
