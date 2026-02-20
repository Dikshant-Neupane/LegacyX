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

  // Check if wallet already has a vault (limit 1 per wallet)
  const [hasExistingVault, setHasExistingVault] = useState(false);
  const [existingVaultName, setExistingVaultName] = useState('');

  useEffect(() => {
    if (publicKey) {
      const walletKey = publicKey.toBase58();
      const drafts = JSON.parse(localStorage.getItem('vault_drafts') || '[]');
      const existing = drafts.find((d: any) => d.walletAddress === walletKey);
      if (existing) {
        setHasExistingVault(true);
        setExistingVaultName(existing.vaultName);
      } else {
        setHasExistingVault(false);
        setExistingVaultName('');
      }
    }
  }, [publicKey, sealed]);

  // Auto-advance from step 0 when wallet connects
  useEffect(() => {
    if (connected && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [connected, currentStep]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const isStep1Valid = vaultName.trim().length >= 2 && checkInDays >= 7;

  // Heirs: just require at least one with a non-empty address
  const isStep2Valid = heirs.some((h) => h.address.trim().length > 0);

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

  const handleSaveVaultDraft = async () => {
    setSealing(true);
    setSealError(null);

    try {
      // Save vault configuration as a draft
      const validHeirs = heirs
        .filter((h) => h.address.trim())
        .map((h) => ({ name: h.label || 'Heir', email: '', relationship: 'heir', address: h.address }));

      const validGuardians = guardianAddresses.filter(Boolean);

      // Store in localStorage keyed to wallet (1 vault per wallet)
      const walletKey = publicKey?.toBase58() || 'unknown';
      const vaultDraft = {
        id: Date.now().toString(),
        walletAddress: walletKey,
        vaultName,
        checkInDays,
        heirs: validHeirs,
        guardians: validGuardians,
        recoveryThreshold: Math.min(recoveryThreshold, validGuardians.length),
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      // Replace any existing vault for this wallet, or add new
      const existing = JSON.parse(localStorage.getItem('vault_drafts') || '[]');
      const filtered = existing.filter((d: any) => d.walletAddress !== walletKey);
      filtered.push(vaultDraft);
      localStorage.setItem('vault_drafts', JSON.stringify(filtered));

      setSealed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save vault';
      setSealError(msg);
      console.error('Vault save failed:', err);
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

        {/* Already has a vault */}
        {hasExistingVault && !sealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="vault-card p-8 text-center mb-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-vault-gold/40 flex items-center justify-center">
              <span className="text-vault-gold text-2xl">✦</span>
            </div>
            <h2 className="font-heading text-xl text-vault-text mb-2">You Already Have a Vault</h2>
            <p className="text-vault-muted text-sm mb-2">
              Your wallet already has a vault: <strong className="text-vault-gold">&quot;{existingVaultName}&quot;</strong>
            </p>
            <p className="text-vault-muted text-xs mb-6">
              Each wallet can create one vault. You can view your existing vault from the dashboard.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-gold"
              data-interactive
            >
              Go to Dashboard
            </button>
          </motion.div>
        )}

        {!hasExistingVault && (
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
                              placeholder="Wallet address or identifier"
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
                            placeholder="Guardian wallet address or identifier"
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
                        &quot;{vaultName}&quot; has been saved.
                        Your vault configuration is stored and ready for on-chain deployment
                        when Solana integration goes live.
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
                        onClick={() => router.push('/dashboard')}
                        className="btn-gold"
                        data-interactive
                      >
                        Go to Dashboard
                      </button>
                    </motion.div>
                  ) : (
                    <div className="text-center py-12">
                      <h2 className="font-heading text-2xl text-vault-text mb-4">
                        Review & Save
                      </h2>
                      <p className="text-vault-muted text-sm max-w-md mx-auto mb-6">
                        Review your vault configuration below.
                      </p>

                      {/* Summary */}
                      <div className="vault-card max-w-sm mx-auto p-6 text-left mb-6">
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

                      {/* Coming Soon Notice */}
                      <div className="vault-card max-w-sm mx-auto p-4 mb-6 border-vault-gold/20">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-vault-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-vault-gold text-xs font-semibold uppercase tracking-wider">Solana Deployment Coming Soon</span>
                        </div>
                        <p className="text-vault-muted text-xs leading-relaxed">
                          On-chain vault sealing will be available in the next release. For now, your vault configuration will be saved as a draft.
                        </p>
                      </div>

                      <button
                        onClick={handleSaveVaultDraft}
                        disabled={sealing}
                        className="btn-gold"
                        data-interactive
                      >
                        {sealing ? 'Saving...' : 'Save Vault Draft'}
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
        )}

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 border-t border-vault-border pt-8"
        >
          <div className="vault-card p-6 bg-vault-surface/50">
            <h3 className="text-vault-gold text-xs font-semibold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Important Disclaimer
            </h3>
            <ul className="space-y-2 text-vault-muted text-xs leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-vault-gold/60 mt-0.5">•</span>
                <span>Once sealed, your vault is deployed as an <strong className="text-vault-text">immutable smart contract</strong> on the Solana blockchain. This action cannot be undone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vault-gold/60 mt-0.5">•</span>
                <span>You are solely responsible for safeguarding your wallet private keys. <strong className="text-vault-text">Lost keys cannot be recovered</strong> by LegacyX.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vault-gold/60 mt-0.5">•</span>
                <span>Ensure all heir and guardian wallet addresses are correct. Incorrect addresses may result in <strong className="text-vault-text">permanent loss of access</strong> to vault contents.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vault-gold/60 mt-0.5">•</span>
                <span>LegacyX is provided <strong className="text-vault-text">as-is</strong> without warranty. We are not liable for any loss of funds, data, or digital assets stored in vaults.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vault-gold/60 mt-0.5">•</span>
                <span>By creating a vault, you agree to the LegacyX <a href="#" className="text-vault-gold hover:underline">Terms of Service</a> and <a href="#" className="text-vault-gold hover:underline">Privacy Policy</a>.</span>
              </li>
            </ul>
          </div>
        </motion.div>
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
