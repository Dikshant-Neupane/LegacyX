/**
 * SoulVault — Borsh Account Deserialization
 *
 * Manually deserializes the VaultAccount from raw Borsh bytes.
 * Matches the Rust struct layout exactly:
 *
 *   pub owner: Pubkey,              // 32 bytes
 *   pub vault_name: String,         // 4-byte length + UTF-8 bytes
 *   pub vault_status: VaultStatus,  // 1 byte (enum discriminator)
 *   pub check_in_interval: i64,     // 8 bytes LE
 *   pub last_check_in: i64,         // 8 bytes LE
 *   pub triggered_at: i64,          // 8 bytes LE
 *   pub beneficiary: Option<Pubkey>,// 1 byte (0=None, 1=Some) + 32 bytes
 *   pub ipfs_cids: Vec<String>,     // 4-byte count + [4-byte len + UTF-8]*
 *   pub file_count: u16,            // 2 bytes LE
 *   pub created_at: i64,            // 8 bytes LE
 *   pub bump: u8,                   // 1 byte
 *
 * SECURITY: This is read-only deserialization. No state mutation.
 */

import { PublicKey } from '@solana/web3.js';

export interface DeserializedVault {
  owner: string;
  vaultName: string;
  status: 'Active' | 'Triggered' | 'Released';
  checkInInterval: number;
  lastCheckIn: number;
  triggeredAt: number;
  beneficiary: string | null;
  ipfsCids: string[];
  fileCount: number;
  createdAt: number;
  bump: number;
}

/**
 * Deserialize a VaultAccount from raw account data bytes.
 * Returns null if the data is malformed.
 *
 * NOTE: The first 8 bytes are the Anchor discriminator (SHA-256("account:VaultAccount")[0..8]).
 */
export function deserializeVaultAccount(data: Buffer): DeserializedVault | null {
  try {
    let offset = 8; // Skip Anchor 8-byte discriminator

    // owner: Pubkey (32 bytes)
    const owner = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;

    // vault_name: String (4-byte length + UTF-8)
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const vaultName = data.subarray(offset, offset + nameLen).toString('utf8');
    offset += nameLen;

    // vault_status: enum (1 byte)
    const statusByte = data[offset];
    offset += 1;
    const statusMap: Record<number, 'Active' | 'Triggered' | 'Released'> = {
      0: 'Active',
      1: 'Triggered',
      2: 'Released',
    };
    const status = statusMap[statusByte] ?? 'Active';

    // check_in_interval: i64 (8 bytes LE)
    const checkInInterval = Number(data.readBigInt64LE(offset));
    offset += 8;

    // last_check_in: i64 (8 bytes LE)
    const lastCheckIn = Number(data.readBigInt64LE(offset));
    offset += 8;

    // triggered_at: i64 (8 bytes LE)
    const triggeredAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // beneficiary: Option<Pubkey> (1 byte tag + 32 bytes if Some)
    const hasBeneficiary = data[offset];
    offset += 1;
    let beneficiary: string | null = null;
    if (hasBeneficiary === 1) {
      beneficiary = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
      offset += 32;
    }

    // ipfs_cids: Vec<String> (4-byte count + [4-byte len + UTF-8]*)
    const cidCount = data.readUInt32LE(offset);
    offset += 4;
    const ipfsCids: string[] = [];
    for (let i = 0; i < cidCount; i++) {
      const cidLen = data.readUInt32LE(offset);
      offset += 4;
      const cid = data.subarray(offset, offset + cidLen).toString('utf8');
      offset += cidLen;
      ipfsCids.push(cid);
    }

    // file_count: u16 (2 bytes LE)
    const fileCount = data.readUInt16LE(offset);
    offset += 2;

    // created_at: i64 (8 bytes LE)
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // bump: u8 (1 byte)
    const bump = data[offset];

    return {
      owner,
      vaultName,
      status,
      checkInInterval,
      lastCheckIn,
      triggeredAt,
      beneficiary,
      ipfsCids,
      fileCount,
      createdAt,
      bump,
    };
  } catch {
    return null;
  }
}
