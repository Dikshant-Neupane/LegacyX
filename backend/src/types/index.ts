import { z } from 'zod';

// ============================================================================
// SHARED TYPES & ZOD SCHEMAS FOR LEGACYX BACKEND
// ============================================================================

// --- Base58 Pubkey validation ---
const pubkeySchema = z.string().min(32).max(44).regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid base58 pubkey');

// --- Signed request base (every authenticated request) ---
export const signedRequestSchema = z.object({
  signature: z.string().min(64, 'Signature required'),
  message: z.string().min(1, 'Message required'),
});

// ==========================================================================
// VAULT SCHEMAS
// ==========================================================================

export const createVaultSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
  vaultName: z.string().min(1).max(64),
  checkInInterval: z.number().int().min(2_592_000).max(157_680_000), // 30d–5yr in seconds
  heirPubkeys: z.array(pubkeySchema).min(1).max(10),
  guardianPubkeys: z.array(pubkeySchema).max(7).default([]),
  recoveryThreshold: z.number().int().min(0).max(7).default(0),
});

export const checkInSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
});

export const uploadFileSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
  encryptedData: z.string().min(1, 'Encrypted data required'),
  contentType: z.string().default('application/octet-stream'),
  encryptedKeyShard: z.string().optional(),
});

export const addHeirSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
  heirPubkey: pubkeySchema,
});

export const addFileSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
  arweaveCid: z.string().min(1).max(64),
  encryptedKeyShard: z.string().max(256).optional(),
});

// ==========================================================================
// IDENTITY SCHEMAS
// ==========================================================================

export const identityProofSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
  faceHash: z.string().length(64, 'SHA-256 hash must be 64 hex chars'),
  voiceHash: z.string().length(64, 'SHA-256 hash must be 64 hex chars'),
});

// ==========================================================================
// RECOVERY SCHEMAS
// ==========================================================================

export const socialRecoverySchema = signedRequestSchema.extend({
  vaultPubkey: pubkeySchema,
  proposedNewOwner: pubkeySchema,
  guardianPubkey: pubkeySchema,
});

// ==========================================================================
// WHISTLEBLOWER SCHEMAS
// ==========================================================================

export const configureWhistleblowerSchema = signedRequestSchema.extend({
  ownerPubkey: pubkeySchema,
  vaultPubkey: pubkeySchema,
  broadcastWallets: z.array(pubkeySchema).min(1).max(50),
});

// ==========================================================================
// CONDITIONAL RELEASE SCHEMAS
// ==========================================================================

export const conditionalReleaseSchema = signedRequestSchema.extend({
  heirPubkey: pubkeySchema,
  vaultPubkey: pubkeySchema,
  conditionIndex: z.number().int().min(0).max(255),
  proofTokenAccount: pubkeySchema.optional(),
});

// ==========================================================================
// BURN MESSAGE SCHEMAS
// ==========================================================================

export const burnMessageSchema = signedRequestSchema.extend({
  heirPubkey: pubkeySchema,
  vaultOwnerPubkey: pubkeySchema,
  cidToBurn: z.string().min(1).max(64),
});

// ==========================================================================
// RESPONSE TYPES
// ==========================================================================

export interface VaultData {
  pubkey: string;
  owner: string;
  vaultName: string;
  status: 'Active' | 'Triggered' | 'Released' | 'Burned';
  checkInInterval: number;
  lastCheckIn: number;
  triggeredAt: number;
  createdAt: number;
  heirPubkeys: string[];
  guardianPubkeys: string[];
  recoveryThreshold: number;
  arweaveCids: string[];
  encryptedKeyShards: string[];
  fileCount: number;
  heirCount: number;
  guardianCount: number;
  whistleblowerEnabled: boolean;
  certificateMint: string | null;
}

export interface TransactionResult {
  success: boolean;
  signature: string;
  links: {
    solscan: string;
    explorer: string;
    orb: string;
  };
}

export interface UploadResult {
  success: boolean;
  arweaveCid: string;
  arweaveUrl: string;
  txSignature: string;
  links: {
    solscan: string;
    explorer: string;
    orb: string;
  };
}

export interface IdentityProofData {
  owner: string;
  faceHash: string;
  voiceHash: string;
  provedAt: number;
  isActive: boolean;
}

export interface RecoveryStatus {
  vault: string;
  proposedNewOwner: string;
  signaturesCollected: number;
  threshold: number;
  isComplete: boolean;
}

export type CreateVaultInput = z.infer<typeof createVaultSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type IdentityProofInput = z.infer<typeof identityProofSchema>;
export type SocialRecoveryInput = z.infer<typeof socialRecoverySchema>;
export type ConfigureWhistleblowerInput = z.infer<typeof configureWhistleblowerSchema>;
export type ConditionalReleaseInput = z.infer<typeof conditionalReleaseSchema>;
export type BurnMessageInput = z.infer<typeof burnMessageSchema>;
