import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  clusterApiUrl,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { VaultData } from '../types';

// ============================================================================
// SOLANA SERVICE — Real Anchor client integration
// Builds serialized transactions for the frontend to sign with Phantom.
// The backend NEVER holds private keys (except optional fee-payer for relaying).
// ============================================================================

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || '8fKi12rubJcmMfGRZErHpmM4sbhCyq7cTTPyS9aPoK4Z',
);

const RPC_ENDPOINTS = [
  process.env.SOLANA_RPC_URL || '',
  ...(process.env.SOLANA_RPC_FALLBACKS || '').split(',').map(s => s.trim()),
  clusterApiUrl('devnet'),
].filter(Boolean);

let currentEndpointIndex = 0;

function getConnection(): Connection {
  return new Connection(RPC_ENDPOINTS[currentEndpointIndex], 'confirmed');
}

function rotateEndpoint(): Connection {
  currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
  return getConnection();
}

async function withRetry<T>(
  fn: (connection: Connection) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error | null = null;
  let connection = getConnection();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn(connection);
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      connection = rotateEndpoint();
    }
  }

  throw lastError || new Error('RPC call failed after all retries');
}

// --- PDA Derivation ---

function deriveVaultPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), owner.toBuffer()],
    PROGRAM_ID,
  );
}

function deriveConditionPda(vault: PublicKey, index: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('condition'), vault.toBuffer(), Buffer.from([index])],
    PROGRAM_ID,
  );
}

function deriveIdentityPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), owner.toBuffer()],
    PROGRAM_ID,
  );
}

function deriveGuardianPda(vault: PublicKey, guardian: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('guardian'), vault.toBuffer(), guardian.toBuffer()],
    PROGRAM_ID,
  );
}

function deriveWhistleblowerPda(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('whistleblower'), vault.toBuffer()],
    PROGRAM_ID,
  );
}

function deriveCertificatePda(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('certificate'), vault.toBuffer()],
    PROGRAM_ID,
  );
}

// --- Anchor Instruction Discriminator ---
function anchorDiscriminator(instructionName: string): Buffer {
  const hash = createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return hash.subarray(0, 8);
}

// --- Borsh serialization helpers ---

function encodeString(s: string): Buffer {
  const strBuf = Buffer.from(s, 'utf-8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length, 0);
  return Buffer.concat([lenBuf, strBuf]);
}

function encodePubkeyVec(keys: PublicKey[]): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(keys.length, 0);
  const keyBufs = keys.map((k) => k.toBuffer());
  return Buffer.concat([lenBuf, ...keyBufs]);
}

function encodeI64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value), 0);
  return buf;
}

function encodeU8(value: number): Buffer {
  return Buffer.from([value]);
}

function encodeOptionString(value: string | undefined): Buffer {
  if (value === undefined || value === null) {
    return Buffer.from([0]); // None
  }
  return Buffer.concat([Buffer.from([1]), encodeString(value)]); // Some
}

// --- Account Data Deserialization ---

const VAULT_STATUS_MAP: Record<number, VaultData['status']> = {
  0: 'Active',
  1: 'Triggered',
  2: 'Released',
  3: 'Burned',
};

function deserializeVaultAccount(data: Buffer, vaultPubkey: string): VaultData | null {
  try {
    let offset = 8; // skip discriminator

    const owner = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;

    const heirLen = data.readUInt32LE(offset);
    offset += 4;
    const heirPubkeys: string[] = [];
    for (let i = 0; i < heirLen; i++) {
      heirPubkeys.push(new PublicKey(data.subarray(offset, offset + 32)).toBase58());
      offset += 32;
    }

    const checkInInterval = Number(data.readBigInt64LE(offset));
    offset += 8;
    const lastCheckIn = Number(data.readBigInt64LE(offset));
    offset += 8;
    const triggeredAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const statusByte = data.readUInt8(offset);
    offset += 1; // Borsh enum: single byte, no padding
    const status = VAULT_STATUS_MAP[statusByte] || 'Active';

    const cidLen = data.readUInt32LE(offset);
    offset += 4;
    const arweaveCids: string[] = [];
    for (let i = 0; i < cidLen; i++) {
      const strLen = data.readUInt32LE(offset);
      offset += 4;
      arweaveCids.push(data.subarray(offset, offset + strLen).toString('utf-8'));
      offset += strLen;
    }

    const shardLen = data.readUInt32LE(offset);
    offset += 4;
    const encryptedKeyShards: string[] = [];
    for (let i = 0; i < shardLen; i++) {
      const strLen = data.readUInt32LE(offset);
      offset += 4;
      encryptedKeyShards.push(data.subarray(offset, offset + strLen).toString('utf-8'));
      offset += strLen;
    }

    const guardianLen = data.readUInt32LE(offset);
    offset += 4;
    const guardianPubkeys: string[] = [];
    for (let i = 0; i < guardianLen; i++) {
      guardianPubkeys.push(new PublicKey(data.subarray(offset, offset + 32)).toBase58());
      offset += 32;
    }

    const recoveryThreshold = data.readUInt8(offset);
    offset += 1;
    const whistleblowerEnabled = data.readUInt8(offset) === 1;
    offset += 1;

    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const vaultName = data.subarray(offset, offset + nameLen).toString('utf-8');
    offset += nameLen;

    const hasCert = data.readUInt8(offset);
    offset += 1;
    let certificateMint: string | null = null;
    if (hasCert === 1) {
      certificateMint = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
      offset += 32;
    }

    const createdAt = Number(data.readBigInt64LE(offset));

    return {
      pubkey: vaultPubkey, owner, vaultName, status,
      checkInInterval, lastCheckIn, triggeredAt, createdAt,
      heirPubkeys, guardianPubkeys, recoveryThreshold,
      arweaveCids, encryptedKeyShards,
      fileCount: arweaveCids.length,
      heirCount: heirPubkeys.length,
      guardianCount: guardianPubkeys.length,
      whistleblowerEnabled, certificateMint,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// EXPORTED SERVICE
// ============================================================================

export const solanaService = {
  getConnection,
  PROGRAM_ID,

  deriveVaultPda,
  deriveConditionPda,
  deriveIdentityPda,
  deriveGuardianPda,
  deriveWhistleblowerPda,
  deriveCertificatePda,

  // --- Read Operations ---

  async getVaultAccount(ownerPubkey: string): Promise<{ pubkey: string; exists: boolean; vault: VaultData | null }> {
    const owner = new PublicKey(ownerPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    return withRetry(async (connection) => {
      const accountInfo = await connection.getAccountInfo(vaultPda);
      if (!accountInfo) {
        return { pubkey: vaultPda.toBase58(), exists: false, vault: null };
      }
      const vault = deserializeVaultAccount(accountInfo.data as Buffer, vaultPda.toBase58());
      return { pubkey: vaultPda.toBase58(), exists: true, vault };
    });
  },

  async getTransaction(signature: string) {
    return withRetry(async (connection) => {
      return connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
    });
  },

  async getCurrentSlot() {
    return withRetry(async (connection) => connection.getSlot());
  },

  async getRecentBlockhash() {
    return withRetry(async (connection) => {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      return { blockhash, lastValidBlockHeight };
    });
  },

  // --- Transaction Builders ---

  async buildCreateVaultTx(params: {
    ownerPubkey: string;
    vaultName: string;
    checkInInterval: number;
    heirPubkeys: string[];
    guardianPubkeys: string[];
    recoveryThreshold: number;
  }): Promise<{ transaction: string; vaultPda: string }> {
    const owner = new PublicKey(params.ownerPubkey);
    const [vaultPda] = deriveVaultPda(owner);
    const heirs = params.heirPubkeys.map((k) => new PublicKey(k));
    const guardians = params.guardianPubkeys.map((k) => new PublicKey(k));

    const instructionData = Buffer.concat([
      anchorDiscriminator('create_vault'),
      encodeString(params.vaultName),
      encodeI64(params.checkInInterval),
      encodePubkeyVec(heirs),
      encodePubkeyVec(guardians),
      encodeU8(params.recoveryThreshold),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
      vaultPda: vaultPda.toBase58(),
    };
  },

  async buildCheckInTx(ownerPubkey: string): Promise<{ transaction: string }> {
    const owner = new PublicKey(ownerPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: anchorDiscriminator('check_in'),
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildTriggerReleaseTx(params: { callerPubkey: string; vaultOwnerPubkey: string }): Promise<{ transaction: string }> {
    const caller = new PublicKey(params.callerPubkey);
    const owner = new PublicKey(params.vaultOwnerPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: caller, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: anchorDiscriminator('trigger_release'),
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: caller });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildReleaseToHeirTx(params: { heirPubkey: string; vaultOwnerPubkey: string }): Promise<{ transaction: string }> {
    const heir = new PublicKey(params.heirPubkey);
    const owner = new PublicKey(params.vaultOwnerPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: heir, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: anchorDiscriminator('release_to_heir'),
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: heir });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildAddFileTx(params: { ownerPubkey: string; arweaveCid: string; encryptedKeyShard?: string }): Promise<{ transaction: string }> {
    const owner = new PublicKey(params.ownerPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    const instructionData = Buffer.concat([
      anchorDiscriminator('add_file'),
      encodeString(params.arweaveCid),
      encodeOptionString(params.encryptedKeyShard),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildAddHeirTx(params: { ownerPubkey: string; heirPubkey: string }): Promise<{ transaction: string }> {
    const owner = new PublicKey(params.ownerPubkey);
    const heir = new PublicKey(params.heirPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    const instructionData = Buffer.concat([
      anchorDiscriminator('add_heir'),
      heir.toBuffer(),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildIdentityProofTx(params: { ownerPubkey: string; faceHash: Buffer; voiceHash: Buffer }): Promise<{ transaction: string; identityPda: string }> {
    const owner = new PublicKey(params.ownerPubkey);
    const [identityPda] = deriveIdentityPda(owner);

    const instructionData = Buffer.concat([
      anchorDiscriminator('identity_proof'),
      params.faceHash,
      params.voiceHash,
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: identityPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
      identityPda: identityPda.toBase58(),
    };
  },

  async buildSocialRecoveryTx(params: { guardianPubkey: string; vaultOwnerPubkey: string; proposedNewOwner: string }): Promise<{ transaction: string }> {
    const guardian = new PublicKey(params.guardianPubkey);
    const owner = new PublicKey(params.vaultOwnerPubkey);
    const proposed = new PublicKey(params.proposedNewOwner);
    const [vaultPda] = deriveVaultPda(owner);
    const [guardianRecordPda] = deriveGuardianPda(vaultPda, guardian);

    const instructionData = Buffer.concat([
      anchorDiscriminator('social_recovery'),
      proposed.toBuffer(),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: guardianRecordPda, isSigner: false, isWritable: true },
        { pubkey: guardian, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: guardian });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildConfigureWhistleblowerTx(params: { ownerPubkey: string; broadcastWallets: string[] }): Promise<{ transaction: string }> {
    const owner = new PublicKey(params.ownerPubkey);
    const [vaultPda] = deriveVaultPda(owner);
    const [whistleblowerPda] = deriveWhistleblowerPda(vaultPda);
    const wallets = params.broadcastWallets.map((k) => new PublicKey(k));

    const instructionData = Buffer.concat([
      anchorDiscriminator('configure_whistleblower'),
      encodePubkeyVec(wallets),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: whistleblowerPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildBurnMessageTx(params: { heirPubkey: string; vaultOwnerPubkey: string; cidToBurn: string }): Promise<{ transaction: string }> {
    const heir = new PublicKey(params.heirPubkey);
    const owner = new PublicKey(params.vaultOwnerPubkey);
    const [vaultPda] = deriveVaultPda(owner);

    const instructionData = Buffer.concat([
      anchorDiscriminator('burn_message'),
      encodeString(params.cidToBurn),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: heir, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: heir });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },

  async buildMintCertificateTx(ownerPubkey: string): Promise<{ transaction: string; certificatePda: string }> {
    const owner = new PublicKey(ownerPubkey);
    const [vaultPda] = deriveVaultPda(owner);
    const [certificatePda] = deriveCertificatePda(vaultPda);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: certificatePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: anchorDiscriminator('mint_certificate'),
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: owner });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
      certificatePda: certificatePda.toBase58(),
    };
  },

  async buildConditionalReleaseTx(params: {
    heirPubkey: string;
    vaultOwnerPubkey: string;
    conditionIndex: number;
    proofTokenAccount?: string;
  }): Promise<{ transaction: string }> {
    const heir = new PublicKey(params.heirPubkey);
    const owner = new PublicKey(params.vaultOwnerPubkey);
    const [vaultPda] = deriveVaultPda(owner);
    const [conditionPda] = deriveConditionPda(vaultPda, params.conditionIndex);

    const keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = [
      { pubkey: vaultPda, isSigner: false, isWritable: false },
      { pubkey: conditionPda, isSigner: false, isWritable: true },
      { pubkey: heir, isSigner: true, isWritable: false },
    ];

    if (params.proofTokenAccount) {
      keys.push({ pubkey: new PublicKey(params.proofTokenAccount), isSigner: false, isWritable: false });
    }

    const ix = new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data: anchorDiscriminator('conditional_release'),
    });

    const { blockhash } = await this.getRecentBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: heir });
    tx.add(ix);

    return {
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    };
  },
};
