/**
 * Check-In Monitoring Cron Job
 *
 * Polls all active vault PDAs on Solana via getProgramAccounts.
 * Identifies vaults approaching trigger threshold.
 * Sends notifications at 30 days, 7 days, and 24 hours before deadline.
 *
 * Designed to run as a Vercel Cron Job (every 24h).
 */

import { PublicKey } from '@solana/web3.js';
import { solanaService } from '../services/solana';
import { notificationService } from '../services/notification';

interface VaultCheckResult {
  vaultPubkey: string;
  owner: string;
  daysRemaining: number;
  status: 'healthy' | 'warning' | 'critical' | 'triggered';
}

const SECONDS_PER_DAY = 86_400;

export async function runCheckInMonitor(): Promise<VaultCheckResult[]> {
  console.log(`[CRON] Check-in monitor running at ${new Date().toISOString()}`);

  const results: VaultCheckResult[] = [];
  const connection = solanaService.getConnection();
  const nowSec = Math.floor(Date.now() / 1000);

  try {
    // Query all accounts owned by our program
    const accounts = await connection.getProgramAccounts(solanaService.PROGRAM_ID, {
      // Filter for vault accounts by size (8-byte discriminator check)
      // Vault accounts are the largest accounts in the program
      filters: [
        { dataSize: 8 + 32 + (4 + 32 * 10) + 8 + 8 + 8 + 2 + 4 + 4 + 4 + 1 + 1 + 4 + 1 + 8 + 1 },
      ],
    });

    // Fallback: try without size filter if exact size doesn't match
    const vaultAccounts = accounts.length > 0 ? accounts : await connection.getProgramAccounts(
      solanaService.PROGRAM_ID,
    );

    for (const { pubkey, account } of vaultAccounts) {
      try {
        const data = account.data;
        if (data.length < 90) continue; // skip non-vault accounts

        // Quick parse: skip discriminator (8), read owner (32), skip heirs vec len
        let offset = 8;
        const owner = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
        offset += 32;

        // Skip heir_pubkeys vec
        const heirLen = data.readUInt32LE(offset);
        offset += 4 + heirLen * 32;

        // Read check_in_interval and last_check_in
        const checkInInterval = Number(data.readBigInt64LE(offset));
        offset += 8;
        const lastCheckIn = Number(data.readBigInt64LE(offset));
        offset += 8;

        // Skip triggered_at
        offset += 8;

        // Read vault_status
        const statusByte = data.readUInt8(offset);
        if (statusByte !== 0 && statusByte !== 1) continue; // only monitor Active/Triggered

        const deadline = lastCheckIn + checkInInterval;
        const secondsRemaining = deadline - nowSec;
        const daysRemaining = Math.floor(secondsRemaining / SECONDS_PER_DAY);

        let status: VaultCheckResult['status'] = 'healthy';

        if (daysRemaining <= 0) {
          status = 'triggered';
        } else if (daysRemaining <= 1) {
          status = 'critical';
          notificationService.sendCheckInReminder(owner, pubkey.toBase58(), daysRemaining);
        } else if (daysRemaining <= 7) {
          status = 'warning';
          notificationService.sendCheckInReminder(owner, pubkey.toBase58(), daysRemaining);
        } else if (daysRemaining <= 30) {
          notificationService.sendCheckInReminder(owner, pubkey.toBase58(), daysRemaining);
        }

        results.push({
          vaultPubkey: pubkey.toBase58(),
          owner,
          daysRemaining: Math.max(0, daysRemaining),
          status,
        });
      } catch {
        // Skip malformed accounts
        continue;
      }
    }
  } catch (error) {
    console.error('[CRON] Failed to scan vaults:', error);
  }

  const warnings = results.filter((r) => r.status !== 'healthy').length;
  console.log(`[CRON] Monitor complete. ${results.length} vaults checked, ${warnings} need attention.`);
  return results;
}

/**
 * Vercel Cron handler
 */
export async function handleCronRequest() {
  const results = await runCheckInMonitor();
  return {
    success: true,
    checked: results.length,
    warnings: results.filter((r) => r.status !== 'healthy').length,
    critical: results.filter((r) => r.status === 'critical' || r.status === 'triggered').length,
    timestamp: new Date().toISOString(),
  };
}
