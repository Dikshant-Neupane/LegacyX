/**
 * LegacyX Solana Program Client
 *
 * TypeScript client for interacting with the LegacyX Anchor program.
 * Provides type-safe wrappers for all program instructions.
 *
 * SECURITY:
 * - Program ID is loaded from env or defaults to devnet deployment
 * - All PDA derivations are deterministic and verifiable
 * - No private keys are ever handled here
 */

import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';

// ─── Program Constants ────────────────────────────────────────────────────────

export const LEGACYX_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'XKKXHcAFTJJdGD9eQVmQkHBUEdtzWjvPamPiN2Lveqz'
);

export const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// ─── PDA Seeds ────────────────────────────────────────────────────────────────

const VAULT_SEED = 'soulvault';
const DEADSWITCH_SEED = 'deadswitch';

// ─── PDA Derivation ───────────────────────────────────────────────────────────

/**
 * Derive the Vault PDA for a given owner wallet.
 */
export function deriveVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBuffer()],
    LEGACYX_PROGRAM_ID
  );
}

/**
 * Derive the Dead Man's Switch PDA for a given vault.
 */
export function deriveDeadSwitchPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(DEADSWITCH_SEED), vault.toBuffer()],
    LEGACYX_PROGRAM_ID
  );
}

// ─── Account Types (matching Rust state) ──────────────────────────────────────

export type VaultStatus = 'Active' | 'Triggered' | 'Released';

export interface VaultAccount {
  owner: PublicKey;
  beneficiary: PublicKey | null;
  checkInInterval: number; // seconds
  lastCheckIn: number; // Unix timestamp
  createdAt: number;
  status: VaultStatus;
  ipfsCids: string[];
  vaultName: string;
  bump: number;
}

export interface DeadManSwitch {
  vault: PublicKey;
  beneficiary: PublicKey;
  inactivityPeriod: number; // seconds (30/60/90 days)
  lastCheckIn: number; // Unix timestamp
  triggered: boolean;
  triggeredAt: number | null;
  bump: number;
}

// ─── Instruction Builders ─────────────────────────────────────────────────────

/**
 * Build a CreateVault instruction.
 */
export function buildCreateVaultIx(params: {
  owner: PublicKey;
  vaultName: string;
  checkInIntervalDays: number;
  beneficiary?: PublicKey;
}) {
  const [vaultPDA] = deriveVaultPDA(params.owner);
  const checkInIntervalSeconds = params.checkInIntervalDays * 86400;

  return {
    vaultPDA,
    accounts: {
      vault: vaultPDA,
      owner: params.owner,
      systemProgram: SystemProgram.programId,
    },
    args: {
      vaultName: params.vaultName,
      checkInInterval: checkInIntervalSeconds,
      beneficiary: params.beneficiary || null,
    },
  };
}

/**
 * Build a CheckIn instruction (resets dead man's switch timer).
 */
export function buildCheckInIx(owner: PublicKey) {
  const [vaultPDA] = deriveVaultPDA(owner);

  return {
    vaultPDA,
    accounts: {
      vault: vaultPDA,
      owner,
    },
  };
}

/**
 * Build an AddFile instruction (store encrypted IPFS CID on-chain).
 */
export function buildAddFileIx(params: {
  owner: PublicKey;
  ipfsCid: string;
}) {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  return {
    vaultPDA,
    accounts: {
      vault: vaultPDA,
      owner: params.owner,
    },
    args: {
      ipfsCid: params.ipfsCid,
    },
  };
}

/**
 * Build a SetBeneficiary instruction.
 */
export function buildSetBeneficiaryIx(params: {
  owner: PublicKey;
  beneficiary: PublicKey;
}) {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  return {
    vaultPDA,
    accounts: {
      vault: vaultPDA,
      owner: params.owner,
    },
    args: {
      beneficiary: params.beneficiary,
    },
  };
}

// ─── Connection Helper ────────────────────────────────────────────────────────

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(DEVNET_RPC, 'confirmed');
  }
  return _connection;
}

/**
 * Fetch a vault account by owner's public key.
 * Returns null if vault doesn't exist.
 */
export async function fetchVaultAccount(
  owner: PublicKey
): Promise<VaultAccount | null> {
  const connection = getConnection();
  const [vaultPDA] = deriveVaultPDA(owner);

  try {
    const accountInfo = await connection.getAccountInfo(vaultPDA);
    if (!accountInfo) return null;

    // TODO: Deserialize using Anchor BorshAccountsCoder when IDL is generated
    // For now, return null to indicate "no vault found"
    return null;
  } catch {
    return null;
  }
}
