/**
 * LegacyX Solana Program Client
 *
 * TypeScript client for interacting with the LegacyX Anchor program.
 * Provides type-safe wrappers for all program instructions.
 */

import { PublicKey, SystemProgram, Connection, Transaction } from '@solana/web3.js';

// ─── Program Constants ────────────────────────────────────────────────────────

export const LEGACYX_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || '8fKi12rubJcmMfGRZErHpmM4sbhCyq7cTTPyS9aPoK4Z'
);

export const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// ─── PDA Seeds ────────────────────────────────────────────────────────────────

const VAULT_SEED = 'vault';
const CONDITION_SEED = 'condition';
const IDENTITY_SEED = 'identity';
const GUARDIAN_SEED = 'guardian';
const WHISTLEBLOWER_SEED = 'whistleblower';

// ─── PDA Derivation ───────────────────────────────────────────────────────────

/**
 * Derive the Vault PDA for a given owner.
 */
export function deriveVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBuffer()],
    LEGACYX_PROGRAM_ID
  );
}

/**
 * Derive a Condition PDA for a vault.
 */
export function deriveConditionPDA(
  vault: PublicKey,
  conditionIndex: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONDITION_SEED),
      vault.toBuffer(),
      new Uint8Array([conditionIndex]),
    ],
    LEGACYX_PROGRAM_ID
  );
}

/**
 * Derive an Identity Proof PDA for a vault.
 */
export function deriveIdentityPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(IDENTITY_SEED), vault.toBuffer()],
    LEGACYX_PROGRAM_ID
  );
}

/**
 * Derive a Guardian PDA.
 */
export function deriveGuardianPDA(
  vault: PublicKey,
  guardian: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GUARDIAN_SEED), vault.toBuffer(), guardian.toBuffer()],
    LEGACYX_PROGRAM_ID
  );
}

/**
 * Derive a Whistleblower Config PDA.
 */
export function deriveWhistleblowerPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WHISTLEBLOWER_SEED), vault.toBuffer()],
    LEGACYX_PROGRAM_ID
  );
}

// ─── Account Types (matching Rust state) ──────────────────────────────────────

export type VaultStatus = 'Active' | 'Triggered' | 'Released' | 'Burned';

export interface VaultAccount {
  owner: PublicKey;
  heirs: PublicKey[];
  guardians: PublicKey[];
  checkInInterval: number; // seconds
  lastCheckIn: number; // Unix timestamp
  createdAt: number;
  status: VaultStatus;
  arweaveCids: string[];
  encryptedKeyShards: string[];
  recoveryThreshold: number;
  recoverySignatures: number;
  vaultName: string;
  bump: number;
}

export interface ConditionType {
  HoldsNft?: { mint: PublicKey };
  HoldsToken?: { mint: PublicKey; amount: number };
  TimestampReached?: { timestamp: number };
  CustomProof?: { hash: number[] };
}

export interface VaultCondition {
  vault: PublicKey;
  conditionType: ConditionType;
  satisfied: boolean;
  createdAt: number;
  satisfiedAt: number | null;
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
  heirs: PublicKey[];
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
      heirs: params.heirs,
    },
  };
}

/**
 * Build a CheckIn instruction.
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
 * Build an AddFile instruction.
 */
export function buildAddFileIx(params: {
  owner: PublicKey;
  arweaveCid: string;
  encryptedKeyShard: string;
}) {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  return {
    vaultPDA,
    accounts: {
      vault: vaultPDA,
      owner: params.owner,
    },
    args: {
      arweaveCid: params.arweaveCid,
      encryptedKeyShard: params.encryptedKeyShard,
    },
  };
}

/**
 * Build an AddHeir instruction.
 */
export function buildAddHeirIx(params: {
  owner: PublicKey;
  heirPubkey: PublicKey;
}) {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  return {
    vaultPDA,
    accounts: {
      vault: vaultPDA,
      owner: params.owner,
    },
    args: {
      heir: params.heirPubkey,
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
