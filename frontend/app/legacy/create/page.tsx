'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Beneficiary {
  name: string;
  email: string;
  relationship: string;
}

export default function CreateLegacyPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { name: '', email: '', relationship: '' }
  ]);
  const [triggerDate, setTriggerDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { name: '', email: '', relationship: '' }]);
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    const updated = [...beneficiaries];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiaries(updated);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validBeneficiaries = beneficiaries.filter(b => b.name && b.email);
      
      await api.createLegacy({
        title,
        message,
        beneficiaries: validBeneficiaries,
        triggerDate: triggerDate || undefined
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create legacy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Link href="/dashboard" className="text-vault-muted text-xs uppercase tracking-[0.3em] hover:text-vault-gold transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="font-display text-section text-vault-text mt-4">Create Legacy</h1>
        </div>

        <div className="vault-card">
          {error && (
            <div className="border border-vault-red/30 bg-vault-red/10 text-vault-red px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm text-vault-muted mb-2">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-vault-surface border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                placeholder="My Legacy for..."
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-vault-muted mb-2">Message *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-vault-surface border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors resize-none"
                placeholder="Write your message to your beneficiaries..."
              />
            </div>

            {/* Beneficiaries */}
            <div>
              <label className="block text-sm text-vault-muted mb-3">Beneficiaries</label>
              {beneficiaries.map((beneficiary, index) => (
                <div key={index} className="mb-3 p-4 bg-vault-surface border border-vault-border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={beneficiary.name}
                      onChange={(e) => updateBeneficiary(index, 'name', e.target.value)}
                      className="px-3 py-2 bg-vault-bg border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={beneficiary.email}
                      onChange={(e) => updateBeneficiary(index, 'email', e.target.value)}
                      className="px-3 py-2 bg-vault-bg border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Relationship"
                        value={beneficiary.relationship}
                        onChange={(e) => updateBeneficiary(index, 'relationship', e.target.value)}
                        className="flex-1 px-3 py-2 bg-vault-bg border border-vault-border rounded-lg text-vault-text placeholder-vault-muted/50 focus:outline-none focus:border-vault-gold transition-colors"
                      />
                      {beneficiaries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBeneficiary(index)}
                          className="px-3 py-2 text-vault-red hover:bg-vault-red/10 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addBeneficiary}
                className="text-sm text-vault-gold hover:underline"
                data-interactive
              >
                + Add another beneficiary
              </button>
            </div>

            {/* Trigger Date */}
            <div>
              <label className="block text-sm text-vault-muted mb-2">Trigger Date (Optional)</label>
              <input
                type="date"
                value={triggerDate}
                onChange={(e) => setTriggerDate(e.target.value)}
                className="w-full px-4 py-3 bg-vault-surface border border-vault-border rounded-lg text-vault-text focus:outline-none focus:border-vault-gold transition-colors"
              />
              <p className="text-xs text-vault-muted mt-2">
                Leave empty to manually trigger later
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-vault-border">
              <button
                type="submit"
                disabled={loading}
                className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Legacy'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn-ghost"
                data-interactive
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
