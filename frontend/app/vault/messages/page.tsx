'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BurnAfterReadToggle, FlameIcon } from '@/components/ui/BurnAfterReadToggle';
import { useEncryption } from '@/hooks/useEncryption';
import { useVault } from '@/hooks/useVault';
import { vaultApi, signAuthMessage } from '@/lib/api';
import { signAndSendTransaction } from '@/lib/transactions';

type MessageStatus = 'sealed' | 'released' | 'burned';

interface Message {
  id: string;
  title: string;
  arweaveCid: string;
  createdAt: string;
  burnAfterRead: boolean;
  status: MessageStatus;
}

export default function RegretVaultPage() {
  const { connected, publicKey, signMessage, signTransaction } = useWallet();
  const { vault, refresh } = useVault();
  const { encryptMessageAndUpload, hasKey, createKey, txProgress } = useEncryption();
  const [messages, setMessages] = useState<Message[]>([]);
  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [burnAnimatingId, setBurnAnimatingId] = useState<string | null>(null);

  // Derive message list from vault's arweaveCids
  useEffect(() => {
    if (vault?.arweaveCids) {
      setMessages(
        vault.arweaveCids.map((cid, i) => ({
          id: cid,
          title: `Sealed message #${i + 1}`,
          arweaveCid: cid,
          createdAt: new Date(vault.createdAt * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          burnAfterRead: false,
          status: vault.status === 'Burned' ? 'burned' : vault.status === 'Released' ? 'released' : 'sealed',
        })),
      );
    }
  }, [vault]);

  const handleSaveMessage = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      // Ensure vault key exists
      if (!hasKey) {
        await createKey();
      }

      // Build message payload with metadata
      const payload = JSON.stringify({
        title: newTitle,
        body: newBody,
        burnAfterRead,
        createdAt: Date.now(),
      });

      // Encrypt message in browser → upload to Arweave → store CID on-chain
      const result = await encryptMessageAndUpload(payload);

      // Refresh vault to get updated CID list
      await refresh();

      setComposing(false);
      setNewTitle('');
      setNewBody('');
      setBurnAfterRead(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save message';
      setSaveError(msg);
      console.error('Failed to save message:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBurnMessage = async (cid: string) => {
    if (!publicKey || !signMessage || !signTransaction) return;
    setBurnAnimatingId(cid);

    try {
      const { signature, message } = await signAuthMessage(signMessage, 'Burn Message');

      const result = await vaultApi.burnMessage({
        heirPubkey: publicKey.toBase58(),
        vaultOwnerPubkey: publicKey.toBase58(),
        cidToBurn: cid,
        signature,
        message,
      });

      await signAndSendTransaction(result.transaction, signTransaction);
      await refresh();

      // Remove from local list after animation
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== cid));
        setBurnAnimatingId(null);
      }, 2000);
    } catch (err) {
      console.error('Burn failed:', err);
      setBurnAnimatingId(null);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <p className="text-vault-muted">Connect your wallet to access messages.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-2">
            Regret Vault
          </p>
          <h1 className="font-display text-section text-vault-text">
            Final Words
          </h1>
          <p className="text-vault-muted text-sm mt-4 max-w-lg">
            Write messages to your heirs. They&apos;ll only be decrypted when your vault
            triggers. Optionally enable &quot;Burn After Read&quot; — message self-destructs
            after being read once.
          </p>
        </motion.div>

        {/* Compose Button */}
        {!composing && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setComposing(true)}
            className="btn-gold mb-8"
            data-interactive
          >
            + Write New Message
          </motion.button>
        )}

        {/* Compose Area */}
        <AnimatePresence>
          {composing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="vault-card mb-8 overflow-hidden"
            >
              <div className="p-6 border-b border-vault-border">
                <h3 className="font-heading text-lg text-vault-text">
                  New Message
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {/* Title */}
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Message title"
                  className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text text-sm focus:outline-none focus:border-vault-gold/50 transition-colors"
                  maxLength={60}
                />

                {/* Body */}
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write your message here. This will be encrypted with AES-256-GCM in your browser..."
                  rows={8}
                  className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 text-vault-text text-sm font-body leading-relaxed focus:outline-none focus:border-vault-gold/50 transition-colors resize-none"
                />

                {/* Controls */}
                <div className="flex items-center justify-between pt-2">
                  <BurnAfterReadToggle
                    enabled={burnAfterRead}
                    onChange={setBurnAfterRead}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setComposing(false);
                        setNewTitle('');
                        setNewBody('');
                      }}
                      className="btn-ghost text-sm"
                      data-interactive
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMessage}
                      disabled={saving || !newTitle.trim() || !newBody.trim()}
                      className="btn-gold text-sm disabled:opacity-30"
                      data-interactive
                    >
                      {saving
                        ? txProgress?.status === 'signing'
                          ? 'Signing...'
                          : txProgress?.status === 'confirming'
                            ? 'Confirming...'
                            : 'Encrypting...'
                        : 'Seal Message'}
                    </button>
                  </div>
                </div>

                {/* Encryption notice */}
                <p className="text-vault-muted text-[10px] pt-2 border-t border-vault-border">
                  🔒 Your message is encrypted in your browser using AES-256-GCM
                  before it ever leaves your device. The server only receives an
                  encrypted blob. Not even we can read it.
                </p>

                {saveError && (
                  <p className="text-vault-red text-xs pt-2">{saveError}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages List */}
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="vault-card group"
            >
              <AnimatePresence>
                {burnAnimatingId === msg.id ? (
                  <motion.div
                    className="p-8 flex flex-col items-center"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                  >
                    <FlameIcon size={48} />
                    <p className="text-vault-red text-sm mt-4">
                      Message burned.
                    </p>
                  </motion.div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-heading text-lg text-vault-text">
                            {msg.title}
                          </h3>
                          {msg.burnAfterRead && (
                            <span className="flex items-center gap-1 text-vault-red text-[10px] uppercase tracking-wider">
                              <FlameIcon size={12} />
                              Burn After Read
                            </span>
                          )}
                        </div>
                        <p className="text-vault-muted text-xs font-mono">
                          CID: {msg.arweaveCid.slice(0, 12)}...{msg.arweaveCid.slice(-6)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="text-vault-muted text-[10px] block">
                          {msg.createdAt}
                        </span>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wider text-vault-gold">
                          <span className="w-1.5 h-1.5 rounded-full bg-vault-gold" />
                          {msg.status}
                        </span>
                        {msg.status === 'sealed' && (
                          <button
                            onClick={() => handleBurnMessage(msg.id)}
                            className="block mt-2 text-vault-red text-[10px] hover:underline"
                            data-interactive
                          >
                            Burn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {messages.length === 0 && !composing && (
          <div className="vault-card p-16 text-center">
            <p className="text-vault-muted text-sm">
              No messages yet. Write your first sealed message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
