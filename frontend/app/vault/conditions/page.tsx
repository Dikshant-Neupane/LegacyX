'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { signAuthMessage } from '@/lib/api';
import { signAndSendTransaction, getExplorerLinks, type TransactionProgress } from '@/lib/transactions';
import { useVault } from '@/hooks/useVault';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConditionType = 'holds_nft' | 'holds_token' | 'timestamp' | 'custom_proof';

interface Condition {
  id: string;
  type: ConditionType;
  label: string;
  description: string;
  config: Record<string, string>;
  satisfied: boolean;
  createdAt: string;
}

const CONDITION_OPTIONS: {
  type: ConditionType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    type: 'holds_nft',
    label: 'Holds NFT',
    description: 'Heir must hold a specific NFT to unlock their share.',
    icon: '🖼',
  },
  {
    type: 'holds_token',
    label: 'Holds Token',
    description: 'Heir must hold a minimum token balance.',
    icon: '🪙',
  },
  {
    type: 'timestamp',
    label: 'Date Reached',
    description: 'Vault unlocks after a specified date.',
    icon: '📅',
  },
  {
    type: 'custom_proof',
    label: 'Custom Proof',
    description: 'Submit a SHA-256 hash that matches a stored secret.',
    icon: '🔑',
  },
];

// ─── Mock Data (conditions fetched from chain would go here) ─────────────────
// On-chain conditions are stored as VaultCondition PDAs. For now, we track
// locally created conditions and will persist once the indexer is built.

export default function ConditionalInheritancePage() {
  const { connected, publicKey, signMessage, signTransaction } = useWallet();
  const { vault } = useVault();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<ConditionType | null>(null);
  const [saving, setSaving] = useState(false);
  const [txProgress, setTxProgress] = useState<TransactionProgress | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form state for new condition
  const [conditionLabel, setConditionLabel] = useState('');
  const [nftMint, setNftMint] = useState('');
  const [tokenMint, setTokenMint] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [proofHash, setProofHash] = useState('');

  const resetForm = () => {
    setSelectedType(null);
    setConditionLabel('');
    setNftMint('');
    setTokenMint('');
    setTokenAmount('');
    setTargetDate('');
    setProofHash('');
    setCreating(false);
  };

  const handleCreateCondition = async () => {
    if (!signMessage || !signTransaction || !publicKey) return;
    setSaving(true);
    setCreateError(null);
    setTxProgress(null);

    try {
      // Build the config based on type
      let config: Record<string, string> = {};
      let desc = '';
      let conditionTypeIndex = 0;
      let conditionValue = '';

      switch (selectedType) {
        case 'holds_nft':
          config = { mint: nftMint };
          desc = `Heir must hold NFT: ${nftMint.slice(0, 8)}...`;
          conditionTypeIndex = 0;
          conditionValue = nftMint;
          break;
        case 'holds_token':
          config = { mint: tokenMint, amount: tokenAmount };
          desc = `Heir must hold ≥${tokenAmount} tokens of ${tokenMint.slice(0, 8)}...`;
          conditionTypeIndex = 1;
          conditionValue = tokenMint;
          break;
        case 'timestamp':
          config = { timestamp: new Date(targetDate).toISOString() };
          desc = `Releases after ${targetDate}`;
          conditionTypeIndex = 2;
          conditionValue = Math.floor(new Date(targetDate).getTime() / 1000).toString();
          break;
        case 'custom_proof':
          config = { hash: proofHash };
          desc = `Must provide matching proof hash`;
          conditionTypeIndex = 3;
          conditionValue = proofHash;
          break;
      }

      // Sign auth message
      const { signature, message } = await signAuthMessage(signMessage, 'Create Condition');

      // Call backend API to build conditional_release transaction
      const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/vault/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerPubkey: publicKey.toBase58(),
          conditionType: conditionTypeIndex,
          conditionValue,
          heirPubkey: vault?.heirPubkeys[0] || publicKey.toBase58(),
          signature,
          message,
        }),
      });

      let txSig: string | undefined;

      if (response.ok) {
        const result = await response.json();
        if (result.transaction) {
          txSig = await signAndSendTransaction(result.transaction, signTransaction, setTxProgress);
        }
      }

      // Add to local state
      setConditions((prev) => [
        ...prev,
        {
          id: txSig || Date.now().toString(),
          type: selectedType!,
          label: conditionLabel || `${selectedType} condition`,
          description: desc,
          config,
          satisfied: false,
          createdAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        },
      ]);

      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create condition';
      setCreateError(msg);
      console.error('Failed to create condition:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <p className="text-vault-muted">Connect your wallet to manage conditions.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-2">
            Smart Conditions
          </p>
          <h1 className="font-display text-section text-vault-text">
            Conditional Inheritance
          </h1>
          <p className="text-vault-muted text-sm mt-4 max-w-lg">
            Set on-chain conditions that must be met before heirs can access vault
            contents. Enforced by immutable smart contracts — no human override possible.
          </p>
        </motion.div>

        {/* Create Condition Button */}
        {!creating && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setCreating(true)}
            className="btn-gold mb-8"
            data-interactive
          >
            + New Condition
          </motion.button>
        )}

        {/* Create Condition Flow */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="vault-card mb-8 overflow-hidden"
            >
              <div className="p-6 border-b border-vault-border">
                <h3 className="font-heading text-lg text-vault-text">
                  {selectedType ? 'Configure Condition' : 'Choose Condition Type'}
                </h3>
              </div>

              <div className="p-6">
                {/* Step 1: Choose type */}
                {!selectedType && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {CONDITION_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => setSelectedType(opt.type)}
                        className="vault-card p-4 text-left hover:border-vault-gold/30 transition-colors group"
                        data-interactive
                      >
                        <span className="text-2xl mb-2 block">{opt.icon}</span>
                        <h4 className="font-heading text-sm text-vault-text group-hover:text-vault-gold transition-colors">
                          {opt.label}
                        </h4>
                        <p className="text-vault-muted text-xs mt-1">
                          {opt.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2: Configure */}
                {selectedType && (
                  <div className="space-y-4">
                    {/* Label */}
                    <div>
                      <label className="block text-sm text-vault-muted mb-1">
                        Condition Label
                      </label>
                      <input
                        type="text"
                        value={conditionLabel}
                        onChange={(e) => setConditionLabel(e.target.value)}
                        placeholder="e.g., Family Crest NFT"
                        className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text text-sm focus:outline-none focus:border-vault-gold/50 transition-colors"
                      />
                    </div>

                    {/* Type-specific fields */}
                    {selectedType === 'holds_nft' && (
                      <div>
                        <label className="block text-sm text-vault-muted mb-1">
                          NFT Mint Address
                        </label>
                        <input
                          type="text"
                          value={nftMint}
                          onChange={(e) => setNftMint(e.target.value)}
                          placeholder="Solana NFT mint address"
                          className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text font-mono text-xs focus:outline-none focus:border-vault-gold/50 transition-colors"
                        />
                      </div>
                    )}

                    {selectedType === 'holds_token' && (
                      <>
                        <div>
                          <label className="block text-sm text-vault-muted mb-1">
                            Token Mint Address
                          </label>
                          <input
                            type="text"
                            value={tokenMint}
                            onChange={(e) => setTokenMint(e.target.value)}
                            placeholder="SPL token mint address"
                            className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text font-mono text-xs focus:outline-none focus:border-vault-gold/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-vault-muted mb-1">
                            Minimum Amount
                          </label>
                          <input
                            type="number"
                            value={tokenAmount}
                            onChange={(e) => setTokenAmount(e.target.value)}
                            placeholder="100"
                            className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text text-sm focus:outline-none focus:border-vault-gold/50 transition-colors"
                          />
                        </div>
                      </>
                    )}

                    {selectedType === 'timestamp' && (
                      <div>
                        <label className="block text-sm text-vault-muted mb-1">
                          Release Date
                        </label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text text-sm focus:outline-none focus:border-vault-gold/50 transition-colors"
                        />
                      </div>
                    )}

                    {selectedType === 'custom_proof' && (
                      <div>
                        <label className="block text-sm text-vault-muted mb-1">
                          Secret Hash (SHA-256)
                        </label>
                        <input
                          type="text"
                          value={proofHash}
                          onChange={(e) => setProofHash(e.target.value)}
                          placeholder="64-character hex hash"
                          className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text font-mono text-xs focus:outline-none focus:border-vault-gold/50 transition-colors"
                          maxLength={64}
                        />
                        <p className="text-vault-muted text-[10px] mt-1">
                          Heir must provide the preimage that produces this hash.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setSelectedType(null)}
                        className="btn-ghost flex-1 text-sm"
                        data-interactive
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCreateCondition}
                        disabled={saving}
                        className="btn-gold flex-1 text-sm disabled:opacity-30"
                        data-interactive
                      >
                        {saving
                          ? txProgress?.status === 'signing'
                            ? 'Signing...'
                            : txProgress?.status === 'confirming'
                              ? 'Confirming...'
                              : 'Creating...'
                          : 'Create Condition'}
                      </button>
                    </div>

                    {createError && (
                      <p className="text-vault-red text-xs mt-2">{createError}</p>
                    )}
                  </div>
                )}

                {/* Cancel */}
                {!selectedType && (
                  <button
                    onClick={resetForm}
                    className="btn-ghost text-sm mt-4 w-full"
                    data-interactive
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Conditions */}
        <div className="space-y-4">
          {conditions.map((cond, i) => {
            const option = CONDITION_OPTIONS.find((o) => o.type === cond.type);
            return (
              <motion.div
                key={cond.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="vault-card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-vault-raised flex items-center justify-center text-lg flex-shrink-0">
                      {option?.icon || '⚙'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-base text-vault-text">
                          {cond.label}
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider text-vault-muted bg-vault-raised px-2 py-0.5 rounded">
                          {option?.label}
                        </span>
                      </div>
                      <p className="text-vault-muted text-xs mt-1">
                        {cond.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        cond.satisfied ? 'text-vault-green' : 'text-vault-amber'
                      }`}
                    >
                      {cond.satisfied ? '✓ Satisfied' : '◯ Pending'}
                    </span>
                    <p className="text-vault-muted text-[10px] mt-1">
                      {cond.createdAt}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {conditions.length === 0 && !creating && (
          <div className="vault-card p-16 text-center">
            <p className="text-vault-muted text-sm">
              No conditions set. Create your first smart condition.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
