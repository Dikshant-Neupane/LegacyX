/**
 * LegacyX — Instruction Builders
 *
 * Creates raw TransactionInstructions for each LegacyX program instruction.
 * These use pre-computed Anchor discriminators (SHA-256("global:<fn_name>")[0..8]).
 *
 * SECURITY: No private keys are handled here. Instructions must be signed
 * by the wallet adapter before submission.
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { LEGACYX_PROGRAM_ID, deriveVaultPDA } from './solana';

// ─── Discriminators (pre-computed) ────────────────────────────────────────────

const DISCRIMINATORS = {
  createVault: Buffer.from([29, 237, 247, 208, 193, 82, 54, 135]),
  checkIn: Buffer.from([209, 253, 4, 217, 250, 241, 207, 50]),
  setBeneficiary: Buffer.from([10, 81, 219, 4, 237, 149, 57, 242]),
  addFile: Buffer.from([61, 123, 92, 31, 229, 59, 59, 213]),
  triggerRelease: Buffer.from([101, 202, 88, 152, 92, 22, 172, 51]),
  releaseToBeneficiary: Buffer.from([181, 247, 242, 92, 139, 175, 156, 65]),
} as const;

// ─── create_vault ─────────────────────────────────────────────────────────────

export function buildCreateVaultInstruction(params: {
  owner: PublicKey;
  vaultName: string;
  checkInIntervalDays: number;
  beneficiary?: PublicKey | null;
}): TransactionInstruction {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  // Borsh: String (4-byte len + utf8), i64 (8 bytes LE), Option<Pubkey> (1 + 32)
  const nameBytes = Buffer.from(params.vaultName);
  const nameLenBuf = Buffer.alloc(4);
  nameLenBuf.writeUInt32LE(nameBytes.length);

  const intervalBuf = Buffer.alloc(8);
  intervalBuf.writeBigInt64LE(BigInt(params.checkInIntervalDays * 86400));

  let beneficiaryBuf: Buffer;
  if (params.beneficiary) {
    beneficiaryBuf = Buffer.concat([Buffer.from([1]), params.beneficiary.toBuffer()]);
  } else {
    beneficiaryBuf = Buffer.from([0]);
  }

  const data = Buffer.concat([
    DISCRIMINATORS.createVault,
    nameLenBuf,
    nameBytes,
    intervalBuf,
    beneficiaryBuf,
  ]);

  return new TransactionInstruction({
    programId: LEGACYX_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ─── check_in ─────────────────────────────────────────────────────────────────

export function buildCheckInInstruction(owner: PublicKey): TransactionInstruction {
  const [vaultPDA] = deriveVaultPDA(owner);

  return new TransactionInstruction({
    programId: LEGACYX_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: DISCRIMINATORS.checkIn,
  });
}

// ─── set_beneficiary ──────────────────────────────────────────────────────────

export function buildSetBeneficiaryInstruction(params: {
  owner: PublicKey;
  beneficiary: PublicKey;
}): TransactionInstruction {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  const data = Buffer.concat([
    DISCRIMINATORS.setBeneficiary,
    params.beneficiary.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: LEGACYX_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

// ─── add_file ─────────────────────────────────────────────────────────────────

export function buildAddFileInstruction(params: {
  owner: PublicKey;
  ipfsCid: string;
}): TransactionInstruction {
  const [vaultPDA] = deriveVaultPDA(params.owner);

  const cidBytes = Buffer.from(params.ipfsCid);
  const cidLenBuf = Buffer.alloc(4);
  cidLenBuf.writeUInt32LE(cidBytes.length);

  const data = Buffer.concat([
    DISCRIMINATORS.addFile,
    cidLenBuf,
    cidBytes,
  ]);

  return new TransactionInstruction({
    programId: LEGACYX_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

// ─── trigger_release ──────────────────────────────────────────────────────────

export function buildTriggerReleaseInstruction(params: {
  vaultOwner: PublicKey;
  caller: PublicKey;
}): TransactionInstruction {
  const [vaultPDA] = deriveVaultPDA(params.vaultOwner);

  return new TransactionInstruction({
    programId: LEGACYX_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: params.caller, isSigner: true, isWritable: false },
    ],
    data: DISCRIMINATORS.triggerRelease,
  });
}

// ─── release_to_beneficiary ──────────────────────────────────────────────────

export function buildReleaseToBeneficiaryInstruction(params: {
  vaultOwner: PublicKey;
  beneficiary: PublicKey;
}): TransactionInstruction {
  const [vaultPDA] = deriveVaultPDA(params.vaultOwner);

  return new TransactionInstruction({
    programId: LEGACYX_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: params.beneficiary, isSigner: true, isWritable: false },
    ],
    data: DISCRIMINATORS.releaseToBeneficiary,
  });
}
