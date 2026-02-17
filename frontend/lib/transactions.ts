// ============================================================================
// TRANSACTION HELPER — Sign and send base64-serialized transactions via Phantom
// The backend builds unsigned transactions; this module handles the Phantom signing
// and on-chain submission flow.
// ============================================================================

import { Connection, Transaction, clusterApiUrl } from '@solana/web3.js';

export type TransactionStatus = 'building' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'failed';

export interface TransactionProgress {
  status: TransactionStatus;
  signature?: string;
  error?: string;
}

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');

function getConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

/**
 * Sign a base64-encoded transaction with Phantom and submit to Solana.
 * Returns the transaction signature.
 *
 * @param base64Tx - Base64-encoded unsigned transaction from the backend
 * @param signTransaction - Phantom's signTransaction from useWallet()
 * @param onProgress - Optional callback for UI status updates
 */
export async function signAndSendTransaction(
  base64Tx: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  onProgress?: (progress: TransactionProgress) => void,
): Promise<string> {
  const connection = getConnection();

  try {
    onProgress?.({ status: 'building' });

    // Deserialize the unsigned transaction from backend
    const txBuffer = Buffer.from(base64Tx, 'base64');
    const transaction = Transaction.from(txBuffer);

    // Sign with Phantom
    onProgress?.({ status: 'signing' });
    const signedTx = await signTransaction(transaction);

    // Send to Solana
    onProgress?.({ status: 'sending' });
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    onProgress?.({ status: 'confirming', signature });

    // Wait for confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    );

    onProgress?.({ status: 'confirmed', signature });
    return signature;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    onProgress?.({ status: 'failed', error: errorMessage });
    throw error;
  }
}

/**
 * Get explorer links for a transaction signature.
 */
export function getExplorerLinks(signature: string) {
  const cluster = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
  return {
    solscan: `https://solscan.io/tx/${signature}?cluster=${cluster}`,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
    orb: `https://orb.helius.dev/?tx=${signature}&cluster=${cluster}`,
  };
}

/**
 * Get explorer links for an account/PDA address.
 */
export function getAccountLinks(address: string) {
  const cluster = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
  return {
    solscan: `https://solscan.io/account/${address}?cluster=${cluster}`,
    explorer: `https://explorer.solana.com/address/${address}?cluster=${cluster}`,
  };
}
