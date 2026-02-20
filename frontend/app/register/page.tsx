'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: any = await api.register(name, email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-6">
      <div className="max-w-md w-full">
        <div className="mb-10">
          <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-2">Get Started</p>
          <h1 className="font-display text-section text-vault-text">Create Account</h1>
        </div>

        <div className="vault-card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="border border-vault-red/30 bg-vault-red/10 text-vault-red px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm text-vault-muted mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-vault-surface border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-vault-muted mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-vault-surface border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-vault-muted mb-2">
                Password (min 6 characters)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-vault-surface border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                placeholder="Choose a strong password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-vault-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-vault-gold hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
