'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Legacy {
  _id: string;
  title: string;
  message: string;
  beneficiaries: Array<{ name: string; email: string; relationship?: string }>;
  triggerDate?: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [legacies, setLegacies] = useState<Legacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchLegacies();
  }, [router]);

  const fetchLegacies = async () => {
    try {
      const data: any = await api.getLegacies();
      setLegacies(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this legacy?')) return;
    
    try {
      await api.deleteLegacy(id);
      setLegacies(legacies.filter((l) => l._id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-vault-muted text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-2">
              Welcome back, {user?.name || 'User'}
            </p>
            <h1 className="font-display text-section text-vault-text">My Legacies</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/legacy/create" className="btn-gold" data-interactive>
              + Create Legacy
            </Link>
            <button
              onClick={handleLogout}
              className="btn-ghost text-sm"
              data-interactive
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-vault-red/30 bg-vault-red/10 text-vault-red px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {legacies.length === 0 ? (
          <div className="vault-card p-12 text-center">
            <div className="text-vault-gold text-4xl mb-4">&#9830;</div>
            <h3 className="font-heading text-xl text-vault-text mb-2">No legacies yet</h3>
            <p className="text-vault-muted text-sm mb-6">Your digital legacy starts here. Create your first one.</p>
            <Link href="/legacy/create" className="btn-gold" data-interactive>
              Create Your First Legacy
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {legacies.map((legacy) => (
              <div key={legacy._id} className="vault-card group">
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <h3 className="font-heading text-lg text-vault-text mb-2">{legacy.title}</h3>
                    <p className="text-vault-muted text-sm mb-3">
                      {legacy.message.length > 150 
                        ? `${legacy.message.substring(0, 150)}...` 
                        : legacy.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-vault-muted">
                      <span className="flex items-center gap-1">
                        <span className="text-vault-gold">&#9679;</span>
                        {legacy.beneficiaries?.length || 0} beneficiaries
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-vault-border capitalize text-[11px]">
                        {legacy.status}
                      </span>
                      {legacy.triggerDate && (
                        <span>{new Date(legacy.triggerDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(legacy._id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-vault-red text-sm px-3 py-1 rounded hover:bg-vault-red/10"
                    data-interactive
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
