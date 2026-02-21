'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { deriveVaultPDA, SOULVAULT_PROGRAM_ID } from '@/lib/solana';

// â”€â”€â”€ Steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STEPS = ['Connect Wallet', 'Name & Configure', 'Set Beneficiary', 'Vault Created'];

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return address.length >= 32 && address.length <= 44;
  } catch {
    return false;
  }
}

function sanitizeVaultName(name: string): string {
  // Allow only alphanumeric, spaces, hyphens, apostrophes â€” max 32 chars
  return name.replace(/[^a-zA-Z0-9 '\-]/g, '').slice(0, 32);
}

// â”€â”€â”€ Inactivity Period Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const INACTIVITY_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
];

// â”€â”€â”€ Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CreateVaultPage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [vaultName, setVaultName] = useState('');
  const [inactivityDays, setInactivityDays] = useState(90);
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultPDA, setVaultPDA] = useState<string | null>(null);

  // Auto-advance to step 1 when wallet connects
  useEffect(() => {
    if (connected && currentStep === 0) {
      setCurrentStep(1);
    }
    if (!connected) {
      setCurrentStep(0);
    }
  }, [connected, currentStep]);

  // â”€â”€â”€ Step Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const canProceedFromStep1 = vaultName.trim().length >= 3;

  const canProceedFromStep2 =
    beneficiaryAddress === '' || isValidSolanaAddress(beneficiaryAddress);

  // â”€â”€â”€ Create Vault Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleCreateVault = useCallback(async () => {
    if (!publicKey || !sendTransaction) return;

    setIsCreating(true);
    setError(null);

    try {
      // Validate beneficiary is not self
      if (beneficiaryAddress && beneficiaryAddress === publicKey.toBase58()) {
        throw new Error('Beneficiary cannot be your own wallet address');
      }

      // Pre-flight: check program exists on-chain
      const programInfo = await connection.getAccountInfo(SOULVAULT_PROGRAM_ID);
      if (!programInfo) {
        throw new Error(
          'SoulVault program is not deployed on this network. ' +
          'Make sure you are connected to the correct Solana cluster and the program has been deployed.'
        );
      }

      // Pre-flight: check if vault PDA already exists
      const [pda] = deriveVaultPDA(publicKey);
      setVaultPDA(pda.toBase58());

      const existingVault = await connection.getAccountInfo(pda);
      if (existingVault) {
        throw new Error('You already have a vault. Each wallet can only create one vault.');
      }

      // Check owner has enough SOL for rent + fees (~0.05 SOL buffer)
      const balance = await connection.getBalance(publicKey);
      if (balance < 5_000_000) {
        // ~0.005 SOL minimum
        throw new Error(
          `Insufficient SOL balance (${(balance / 1e9).toFixed(4)} SOL). ` +
          'You need SOL to pay for account rent and transaction fees. ' +
          'Get devnet SOL at https://faucet.solana.com'
        );
      }

      // Build the create_vault instruction data (Anchor discriminator + Borsh args)
      const discriminator = Buffer.from([
        29, 237, 247, 208, 193, 82, 54, 135,
      ]);

      // Borsh-serialize the arguments:
      // vault_name: String, check_in_interval: i64, beneficiary: Option<Pubkey>
      const nameBytes = Buffer.from(vaultName.trim());
      const nameLenBuf = Buffer.alloc(4);
      nameLenBuf.writeUInt32LE(nameBytes.length);

      const intervalBuf = Buffer.alloc(8);
      intervalBuf.writeBigInt64LE(BigInt(inactivityDays * 86400));

      let beneficiaryBuf: Buffer;
      if (beneficiaryAddress && isValidSolanaAddress(beneficiaryAddress)) {
        const benPk = new PublicKey(beneficiaryAddress);
        beneficiaryBuf = Buffer.concat([Buffer.from([1]), benPk.toBuffer()]);
      } else {
        beneficiaryBuf = Buffer.from([0]);
      }

      const data = Buffer.concat([
        discriminator,
        nameLenBuf,
        nameBytes,
        intervalBuf,
        beneficiaryBuf,
      ]);

      const ix = new TransactionInstruction({
        programId: SOULVAULT_PROGRAM_ID,
        keys: [
          { pubkey: pda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');

      setCurrentStep(3);
    } catch (err: unknown) {
      console.error('Vault creation error:', err);
      let message = 'Failed to create vault';

      if (err instanceof Error) {
        // Parse wallet adapter / simulation errors for better UX
        const msg = err.message;
        if (msg.includes('User rejected')) {
          message = 'Transaction was cancelled by the user.';
        } else if (msg.includes('Simulation failed') || msg.includes('reverted during simulation')) {
          message =
            'Transaction simulation failed. This usually means the program is not deployed on the current network, ' +
            'or the vault account already exists. Check your Solana cluster and try again.';
        } else if (msg.includes('0x0')) {
          message = 'On-chain error: A vault may already exist for this wallet.';
        } else if (msg.includes('Insufficient')) {
          message = msg; // Already descriptive from our pre-flight check
        } else if (msg.includes('not deployed')) {
          message = msg;
        } else if (msg.includes('already have a vault')) {
          message = msg;
        } else if (msg.includes('Beneficiary cannot')) {
          message = msg;
        } else {
          // Include raw error for debugging
          message = `Transaction failed: ${msg}`;
        }
      }

      setError(message);
    } finally {
      setIsCreating(false);
    }
  }, [publicKey, beneficiaryAddress, vaultName, inactivityDays, sendTransaction, connection]);

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border transition-colors ${
                  i < currentStep
                    ? 'bg-vault-gold text-vault-bg border-vault-gold'
                    : i === currentStep
                    ? 'border-vault-gold text-vault-gold'
                    : 'border-vault-border text-vault-muted'
                }`}
              >
                {i < currentStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px transition-colors ${
                    i < currentStep ? 'bg-vault-gold' : 'bg-vault-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {/* STEP 0: Connect Wallet */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="font-display text-3xl mb-4">Connect Your Wallet</h2>
              <p className="text-vault-muted mb-8">
                Your Phantom wallet is your key to the vault. No email, no password.
              </p>
              <ConnectWalletButton />
            </motion.div>
          )}

          {/* STEP 1: Name & Configure */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="font-display text-3xl mb-2">Name Your Vault</h2>
                <p className="text-vault-muted text-sm">
                  Give it a name and choose your check-in frequency.
                </p>
              </div>

              {/* Vault name */}
              <div>
                <label className="block text-sm text-vault-muted mb-2 font-mono">
                  VAULT NAME
                </label>
                <input
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(sanitizeVaultName(e.target.value))}
                  placeholder="My Digital Legacy"
                  maxLength={32}
                  className="w-full bg-vault-surface border border-vault-border rounded-lg px-4 py-3
                             text-vault-text placeholder-vault-muted/40 font-body
                             focus:border-vault-gold focus:outline-none transition-colors"
                />
                <span className="text-xs text-vault-muted mt-1 block">
                  {vaultName.length}/32 characters
                </span>
              </div>

              {/* Inactivity period */}
              <div>
                <label className="block text-sm text-vault-muted mb-3 font-mono">
                  DEAD MAN&apos;S SWITCH â€” INACTIVITY PERIOD
                </label>
                <p className="text-xs text-vault-muted mb-4">
                  If you don&apos;t check in within this period, your beneficiary gets access.
                </p>
                <div className="flex gap-3">
                  {INACTIVITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setInactivityDays(option.value)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                        inactivityDays === option.value
                          ? 'border-vault-gold bg-vault-gold/10 text-vault-gold'
                          : 'border-vault-border text-vault-muted hover:border-vault-gold/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next button */}
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedFromStep1}
                className="w-full btn-gold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* STEP 2: Set Beneficiary */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="font-display text-3xl mb-2">Set Beneficiary</h2>
                <p className="text-vault-muted text-sm">
                  Who should receive access to your vault if the dead man&apos;s switch activates?
                </p>
              </div>

              {/* Beneficiary address */}
              <div>
                <label className="block text-sm text-vault-muted mb-2 font-mono">
                  BENEFICIARY WALLET ADDRESS
                </label>
                <input
                  type="text"
                  value={beneficiaryAddress}
                  onChange={(e) => setBeneficiaryAddress(e.target.value.trim())}
                  placeholder="Enter Solana wallet address (optional)"
                  className={`w-full bg-vault-surface border rounded-lg px-4 py-3
                             text-vault-text placeholder-vault-muted/40 font-mono text-sm
                             focus:outline-none transition-colors ${
                               beneficiaryAddress && !isValidSolanaAddress(beneficiaryAddress)
                                 ? 'border-vault-red focus:border-vault-red'
                                 : 'border-vault-border focus:border-vault-gold'
                             }`}
                />
                {beneficiaryAddress && !isValidSolanaAddress(beneficiaryAddress) && (
                  <span className="text-xs text-vault-red mt-1 block">
                    Invalid Solana address
                  </span>
                )}
                <span className="text-xs text-vault-muted mt-2 block">
                  You can add or change this later. Leave blank to skip for now.
                </span>
              </div>

              {/* Summary card */}
              <div className="vault-card space-y-3">
                <h3 className="font-mono text-xs text-vault-gold uppercase tracking-wider">
                  Vault Summary
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Name</span>
                  <span className="text-vault-text">{vaultName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Inactivity Period</span>
                  <span className="text-vault-text">{inactivityDays} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Beneficiary</span>
                  <span className="text-vault-text font-mono text-xs">
                    {beneficiaryAddress
                      ? `${beneficiaryAddress.slice(0, 6)}...${beneficiaryAddress.slice(-4)}`
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Owner</span>
                  <span className="text-vault-text font-mono text-xs">
                    {publicKey
                      ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
                      : 'â€”'}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-vault-red bg-vault-red/10 border border-vault-red/20 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="btn-ghost flex-1"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateVault}
                  disabled={isCreating || !canProceedFromStep2}
                  className="btn-gold flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Vault'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Vault Created */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="mx-auto w-20 h-20 rounded-full bg-vault-green/10 border-2 border-vault-green
                           flex items-center justify-center"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vault-green">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>

              <div>
                <h2 className="font-display text-3xl mb-2">Vault Created</h2>
                <p className="text-vault-muted">
                  Your SoulVault is now sealed on Solana. Only your wallet can unlock it.
                </p>
              </div>

              {/* Vault details */}
              <div className="vault-card text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Vault PDA</span>
                  <span className="text-vault-gold font-mono text-xs">
                    {vaultPDA
                      ? `${vaultPDA.slice(0, 8)}...${vaultPDA.slice(-6)}`
                      : 'â€”'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Network</span>
                  <span className="text-vault-text">Solana Devnet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Status</span>
                  <span className="text-vault-green font-medium">Active</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/vault')}
                  className="btn-gold flex-1"
                >
                  Open Vault Dashboard
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="btn-ghost flex-1"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
