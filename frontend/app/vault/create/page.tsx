'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { GoldTimeline } from '@/components/ui/GoldTimeline';
import { CustomSlider } from '@/components/ui/CustomSlider';
import { FileParticleDissolve } from '@/components/ui/FileParticleDissolve';
import { useEncryption } from '@/hooks/useEncryption';
import { vaultApi, signAuthMessage } from '@/lib/api';
import { signAndSendTransaction, getExplorerLinks, type TransactionProgress } from '@/lib/transactions';
import dynamic from 'next/dynamic';

const VaultOrb = dynamic(
  () => import('@/components/vault/VaultOrb').then((m) => m.VaultOrb),
  { ssr: false }
);

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  'Connect Wallet',
  'Name & Configure',
  'Add Heirs & Guardians',
  'Upload First Item',
  'Vault Sealed',
];

interface HeirEntry {
  address: string;
  label: string;
}

export default function CreateVaultPage() {
  const { publicKey, connected, signMessage, signTransaction } = useWallet();
  const router = useRouter();
  const { createKey, encryptAndUpload, hasKey } = useEncryption();
  const [txProgress, setTxProgress] = useState<TransactionProgress | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);

  // Form state
  const [currentStep, setCurrentStep] = useState(connected ? 1 : 0);
  const [vaultName, setVaultName] = useState('');
  const [checkInDays, setCheckInDays] = useState(90);
  const [heirs, setHeirs] = useState<HeirEntry[]>([{ address: '', label: '' }]);
  const [guardianAddresses, setGuardianAddresses] = useState<string[]>(['']);
  const [recoveryThreshold, setRecoveryThreshold] = useState(2);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Seal state
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);

  // Auto-advance from step 0 when wallet connects
  useEffect(() => {
    if (connected && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [connected, currentStep]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const isStep1Valid = vaultName.trim().length >= 3 && checkInDays >= 7;

  const isStep2Valid =
    heirs.some((h) => {
      try {
        new PublicKey(h.address);
        return true;
      } catch {
        return false;
      }
    });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const addHeir = () => {
    if (heirs.length < 5) {
      setHeirs([...heirs, { address: '', label: '' }]);
    }
  };

  const updateHeir = (index: number, field: keyof HeirEntry, value: string) => {
    const updated = [...heirs];
    updated[index][field] = value;
    setHeirs(updated);
  };

  const removeHeir = (index: number) => {
    setHeirs(heirs.filter((_, i) => i !== index));
  };

  const addGuardian = () => {
    if (guardianAddresses.length < 5) {
      setGuardianAddresses([...guardianAddresses, '']);
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedFile(file);
    },
    []
  );

  const handleEncryptAndUpload = async () => {
    if (!selectedFile || !signMessage) return;
    setEncrypting(true);

    try {
      // Ensure vault key exists
      if (!hasKey) {
        await createKey();
      }

      // Encrypt in browser → upload to Arweave → store CID on-chain
      const result = await encryptAndUpload(selectedFile);
      setUploadComplete(true);
      setTimeout(() => setCurrentStep(4), 1000);
    } catch (err) {
      console.error('Encryption/upload failed:', err);
    } finally {
      setEncrypting(false);
    }
  };

  const handleSealVault = async () => {
    if (!publicKey || !signMessage || !signTransaction) return;
    setSealing(true);
    setSealError(null);
    setTxProgress(null);

    try {
      // 1. Sign auth message (Phantom popup #1)
      setTxProgress({ status: 'building' });
      const { signature, message } = await signAuthMessage(signMessage, 'Create Vault');

      // 2. Filter valid heir and guardian addresses
      const validHeirs = heirs
        .filter((h) => {
          try { new PublicKey(h.address); return true; } catch { return false; }
        })
        .map((h) => h.address);

      const validGuardians = guardianAddresses.filter((a) => {
        try { new PublicKey(a); return true; } catch { return false; }
      });

      // 3. Get unsigned transaction from backend
      const result = await vaultApi.create({
        ownerPubkey: publicKey.toBase58(),
        vaultName,
        checkInInterval: checkInDays * 24 * 60 * 60, // Convert days to seconds
        heirPubkeys: validHeirs,
        guardianPubkeys: validGuardians,
        recoveryThreshold: Math.min(recoveryThreshold, validGuardians.length),
        signature,
        message,
      });

      // 4. Sign and send the transaction (Phantom popup #2)
      const txSig = await signAndSendTransaction(result.transaction, signTransaction, setTxProgress);
      setTxSignature(txSig);

      setSealed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Vault creation failed';
      setSealError(msg);
      console.error('Vault creation failed:', err);
    } finally {
      setSealing(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-2">
            Create New Vault
          </p>
          <h1 className="font-display text-section text-vault-text">
            Seal Your Legacy
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Left — Timeline */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <GoldTimeline steps={STEPS} currentStep={currentStep} />
          </motion.div>

          {/* Right — Step Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* ─── Step 0: Connect Wallet ───────────────────── */}
              {currentStep === 0 && (
                <StepContainer key="step-0">
                  <h2 className="font-heading text-2xl text-vault-text mb-4">
                    Connect Your Wallet
                  </h2>
                  <p className="text-vault-muted text-sm mb-8">
                    Your Phantom wallet is your identity. No email, no password — just
                    your keys.
                  </p>
                  <div className="vault-card p-8 text-center">
                    <p className="text-vault-muted text-sm">
                      Use the &quot;Connect Phantom&quot; button in the header to get started.
                    </p>
                  </div>
                </StepContainer>
              )}

              {/* ─── Step 1: Name & Configure ─────────────────── */}
              {currentStep === 1 && (
                <StepContainer key="step-1">
                  <h2 className="font-heading text-2xl text-vault-text mb-8">
                    Name & Configure
                  </h2>

                  <div className="space-y-8">
                    {/* Vault Name */}
                    <div>
                      <label className="block text-sm text-vault-muted mb-2">
                        Vault Name
                      </label>
                      <input
                        type="text"
                        value={vaultName}
                        onChange={(e) => setVaultName(e.target.value)}
                        placeholder="My Legacy Vault"
                        className="w-full bg-vault-surface border border-vault-border rounded-lg px-4 py-3 text-vault-text font-body text-sm focus:outline-none focus:border-vault-gold/50 transition-colors"
                        maxLength={32}
                      />
                      <p className="text-vault-muted text-[10px] mt-1">
                        {vaultName.length}/32 characters
                      </p>
                    </div>

                    {/* Check-In Interval */}
                    <div>
                      <CustomSlider
                        min={7}
                        max={365}
                        value={checkInDays}
                        step={1}
                        onChange={setCheckInDays}
                        label="Check-In Interval"
                        unit="days"
                      />
                      <p className="text-vault-muted text-[10px] mt-2">
                        If you don&apos;t check in within this period, your vault becomes
                        accessible to designated heirs.
                      </p>
                    </div>

                    {/* Continue */}
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={!isStep1Valid}
                      className="btn-gold w-full disabled:opacity-30 disabled:cursor-not-allowed"
                      data-interactive
                    >
                      Continue
                    </button>
                  </div>
                </StepContainer>
              )}

              {/* ─── Step 2: Add Heirs & Guardians ────────────── */}
              {currentStep === 2 && (
                <StepContainer key="step-2">
                  <h2 className="font-heading text-2xl text-vault-text mb-2">
                    Heirs & Guardians
                  </h2>
                  <p className="text-vault-muted text-sm mb-8">
                    Heirs receive your vault. Guardians help recover access.
                  </p>

                  <div className="space-y-8">
                    {/* Heirs */}
                    <div>
                      <h3 className="text-sm text-vault-gold uppercase tracking-wider mb-4">
                        Heirs
                      </h3>
                      <div className="space-y-3">
                        {heirs.map((heir, i) => (
                          <div key={i} className="flex gap-3">
                            <input
                              type="text"
                              value={heir.address}
                              onChange={(e) =>
                                updateHeir(i, 'address', e.target.value)
                              }
                              placeholder="Solana wallet address"
                              className="flex-1 bg-vault-surface border border-vault-border rounded-lg px-4 py-3 text-vault-text font-mono text-xs focus:outline-none focus:border-vault-gold/50 transition-colors"
                            />
                            <input
                              type="text"
                              value={heir.label}
                              onChange={(e) =>
                                updateHeir(i, 'label', e.target.value)
                              }
                              placeholder="Label (optional)"
                              className="w-32 bg-vault-surface border border-vault-border rounded-lg px-3 py-3 text-vault-text text-xs focus:outline-none focus:border-vault-gold/50 transition-colors"
                            />
                            {heirs.length > 1 && (
                              <button
                                onClick={() => removeHeir(i)}
                                className="text-vault-muted hover:text-vault-red text-xs px-2"
                                data-interactive
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {heirs.length < 5 && (
                        <button
                          onClick={addHeir}
                          className="text-vault-gold text-xs mt-3 hover:underline"
                          data-interactive
                        >
                          + Add another heir
                        </button>
                      )}
                    </div>

                    {/* Guardians */}
                    <div>
                      <h3 className="text-sm text-vault-gold uppercase tracking-wider mb-4">
                        Guardians (Social Recovery)
                      </h3>
                      <div className="space-y-3">
                        {guardianAddresses.map((addr, i) => (
                          <input
                            key={i}
                            type="text"
                            value={addr}
                            onChange={(e) => {
                              const updated = [...guardianAddresses];
                              updated[i] = e.target.value;
                              setGuardianAddresses(updated);
                            }}
                            placeholder="Guardian wallet address"
                            className="w-full bg-vault-surface border border-vault-border rounded-lg px-4 py-3 text-vault-text font-mono text-xs focus:outline-none focus:border-vault-gold/50 transition-colors"
                          />
                        ))}
                      </div>
                      {guardianAddresses.length < 5 && (
                        <button
                          onClick={addGuardian}
                          className="text-vault-gold text-xs mt-3 hover:underline"
                          data-interactive
                        >
                          + Add guardian
                        </button>
                      )}

                      {guardianAddresses.filter(Boolean).length >= 2 && (
                        <div className="mt-4">
                          <CustomSlider
                            min={2}
                            max={Math.max(2, guardianAddresses.filter(Boolean).length)}
                            value={recoveryThreshold}
                            onChange={setRecoveryThreshold}
                            label="Recovery Threshold"
                            unit={`of ${guardianAddresses.filter(Boolean).length}`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="btn-ghost flex-1"
                        data-interactive
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(3)}
                        disabled={!isStep2Valid}
                        className="btn-gold flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        data-interactive
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </StepContainer>
              )}

              {/* ─── Step 3: Upload First Item ────────────────── */}
              {currentStep === 3 && (
                <StepContainer key="step-3">
                  <h2 className="font-heading text-2xl text-vault-text mb-2">
                    Upload First Item
                  </h2>
                  <p className="text-vault-muted text-sm mb-8">
                    Upload your first encrypted file. Everything is encrypted in your browser
                    before leaving — the server never sees plaintext.
                  </p>

                  <div className="space-y-6">
                    {encrypting ? (
                      <div className="vault-card p-12 flex flex-col items-center">
                        <FileParticleDissolve
                          active
                          fileName={selectedFile?.name}
                        />
                      </div>
                    ) : uploadComplete ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="vault-card p-12 text-center"
                      >
                        <div className="text-vault-green text-4xl mb-4">✓</div>
                        <p className="text-vault-text font-heading text-lg">
                          Encrypted & Uploaded
                        </p>
                        <p className="text-vault-muted text-xs mt-2">
                          {selectedFile?.name} → Arweave (permanent)
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        {/* Drop zone */}
                        <label
                          className="upload-zone flex flex-col items-center justify-center p-16 cursor-pointer group"
                          data-interactive
                        >
                          <input
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.mp3,.wav,.webm,.mp4,.json"
                          />
                          <div className="text-vault-gold text-3xl mb-4 group-hover:scale-110 transition-transform">
                            ↑
                          </div>
                          <p className="text-vault-text text-sm mb-1">
                            {selectedFile
                              ? selectedFile.name
                              : 'Drop a file or click to browse'}
                          </p>
                          <p className="text-vault-muted text-[10px]">
                            PDF, images, audio, video, text — up to 100MB
                          </p>
                        </label>

                        {selectedFile && (
                          <button
                            onClick={handleEncryptAndUpload}
                            className="btn-gold w-full"
                            data-interactive
                          >
                            Encrypt & Upload to Arweave
                          </button>
                        )}
                      </>
                    )}

                    {/* Skip option */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="btn-ghost flex-1"
                        data-interactive
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="btn-ghost flex-1 text-vault-muted"
                        data-interactive
                      >
                        Skip for now →
                      </button>
                    </div>
                  </div>
                </StepContainer>
              )}

              {/* ─── Step 4: Vault Sealed ─────────────────────── */}
              {currentStep === 4 && (
                <StepContainer key="step-4">
                  {sealed ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      {/* Wax seal stamp */}
                      <motion.div
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 200,
                          damping: 15,
                          delay: 0.3,
                        }}
                        className="w-32 h-32 mx-auto mb-8 rounded-full border-4 border-vault-gold flex items-center justify-center bg-vault-surface"
                      >
                        <span className="font-display text-4xl text-vault-gold">
                          ✦
                        </span>
                      </motion.div>

                      <h2 className="font-display text-3xl text-vault-text mb-4">
                        Vault Sealed
                      </h2>
                      <p className="text-vault-muted text-sm max-w-md mx-auto mb-8">
                        &quot;{vaultName}&quot; is now live on Solana devnet.
                        Your legacy is encrypted and only your heirs can access it —
                        not even us.
                      </p>

                      {txSignature && (
                        <div className="flex justify-center gap-4 mb-6">
                          {Object.entries(getExplorerLinks(txSignature)).map(([name, url]) => (
                            <a
                              key={name}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-vault-gold text-xs hover:underline capitalize"
                            >
                              {name} ↗
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="w-48 h-48 mx-auto mb-8">
                        <VaultOrb size="small" />
                      </div>

                      <button
                        onClick={() => router.push('/vault')}
                        className="btn-gold"
                        data-interactive
                      >
                        Go to Your Vault
                      </button>
                    </motion.div>
                  ) : (
                    <div className="text-center py-12">
                      <h2 className="font-heading text-2xl text-vault-text mb-4">
                        Ready to Seal
                      </h2>
                      <p className="text-vault-muted text-sm max-w-md mx-auto mb-8">
                        This will deploy your vault as an immutable smart contract on Solana.
                        Review your configuration:
                      </p>

                      {/* Summary */}
                      <div className="vault-card max-w-sm mx-auto p-6 text-left mb-8">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-vault-muted text-xs">Name</span>
                            <span className="text-vault-text text-sm">{vaultName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vault-muted text-xs">Check-in</span>
                            <span className="text-vault-text text-sm">{checkInDays} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vault-muted text-xs">Heirs</span>
                            <span className="text-vault-text text-sm">
                              {heirs.filter((h) => h.address).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vault-muted text-xs">Guardians</span>
                            <span className="text-vault-text text-sm">
                              {guardianAddresses.filter(Boolean).length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSealVault}
                        disabled={sealing}
                        className="btn-gold"
                        data-interactive
                      >
                        {sealing
                          ? txProgress?.status === 'signing'
                            ? 'Approve in Phantom...'
                            : txProgress?.status === 'sending'
                              ? 'Sending to Solana...'
                              : txProgress?.status === 'confirming'
                                ? 'Confirming on-chain...'
                                : txProgress?.status === 'building'
                                  ? 'Approve Signature in Phantom...'
                                  : 'Preparing...'
                          : 'Seal Vault on Solana'}
                      </button>

                      {sealError && (
                        <p className="text-vault-red text-xs mt-4">{sealError}</p>
                      )}
                    </div>
                  )}
                </StepContainer>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Container ───────────────────────────────────────────────────────────

function StepContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
