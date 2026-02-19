// LegacyX — Cron Job: Check-In Monitor
//
// Runs daily at midnight UTC (configured in vercel.json) to monitor
// all active vaults. If a vault owner has missed their check-in
// deadline, this cron triggers the vault release process.
//
// Vercel Hobby plan: 1 cron job allowed, minimum once daily.
// Schedule: "0 0 * * *" (daily at midnight UTC)
// Security: Protected by Vercel CRON_SECRET header.

import { NextRequest, NextResponse } from 'next/server';

// ─── Configuration ────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
const CRON_SECRET = process.env.CRON_SECRET;

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaultSummary {
    pubkey: string;
    owner: string;
    vaultName: string;
    status: 'Active' | 'Triggered' | 'Released' | 'Burned';
    checkInInterval: number; // seconds
    lastCheckIn: number;     // Unix timestamp
}

interface CronResult {
    vault: string;
    owner: string;
    vaultName: string;
    action: 'triggered' | 'skipped' | 'error';
    reason: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    // ── 1. Verify Cron Secret ───────────────────────────────────────────────
    // Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` header
    if (CRON_SECRET) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            console.error('[CRON] Unauthorized request — invalid CRON_SECRET');
            return NextResponse.json(
                { ok: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    console.log('[CRON] Check-In Monitor started at', new Date().toISOString());

    // ── 2. Fetch all active vaults from backend ─────────────────────────────
    let vaults: VaultSummary[] = [];
    try {
        const response = await fetch(`${BACKEND_URL}/vault/active`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // Vercel serverless functions have a 10s timeout on Hobby
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            // If the backend doesn't have a /vault/active endpoint yet,
            // log it and return gracefully
            if (response.status === 404) {
                console.warn('[CRON] Backend /vault/active endpoint not found. Skipping.');
                return NextResponse.json({
                    ok: true,
                    message: 'Cron executed but /vault/active endpoint not available yet',
                    timestamp: new Date().toISOString(),
                    durationMs: Date.now() - startTime,
                });
            }
            throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        vaults = data.vaults || [];
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CRON] Failed to fetch active vaults:', message);
        return NextResponse.json(
            {
                ok: false,
                error: `Failed to fetch vaults: ${message}`,
                timestamp: new Date().toISOString(),
                durationMs: Date.now() - startTime,
            },
            { status: 502 }
        );
    }

    console.log(`[CRON] Found ${vaults.length} active vault(s) to check`);

    // ── 3. Check each vault for missed deadlines ───────────────────────────
    const now = Math.floor(Date.now() / 1000); // current Unix timestamp
    const results: CronResult[] = [];

    for (const vault of vaults) {
        const deadline = vault.lastCheckIn + vault.checkInInterval;
        const isOverdue = now > deadline;

        if (!isOverdue) {
            const remainingHours = Math.round((deadline - now) / 3600);
            results.push({
                vault: vault.pubkey,
                owner: vault.owner,
                vaultName: vault.vaultName,
                action: 'skipped',
                reason: `Check-in still valid (${remainingHours}h remaining)`,
            });
            continue;
        }

        // Vault owner missed their check-in — trigger release
        console.log(
            `[CRON] Vault "${vault.vaultName}" (${vault.pubkey.slice(0, 8)}...) ` +
            `is OVERDUE by ${Math.round((now - deadline) / 3600)}h — triggering release`
        );

        try {
            const triggerResponse = await fetch(`${BACKEND_URL}/vault/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vaultPubkey: vault.pubkey,
                    reason: 'missed_check_in',
                    cronTriggered: true,
                }),
                signal: AbortSignal.timeout(8000),
            });

            if (triggerResponse.ok) {
                console.log(`[CRON] Successfully triggered vault "${vault.vaultName}"`);
                results.push({
                    vault: vault.pubkey,
                    owner: vault.owner,
                    vaultName: vault.vaultName,
                    action: 'triggered',
                    reason: `Missed check-in by ${Math.round((now - deadline) / 3600)}h`,
                });
            } else {
                const errorData = await triggerResponse.json().catch(() => ({}));
                console.error(
                    `[CRON] Failed to trigger vault "${vault.vaultName}":`,
                    errorData
                );
                results.push({
                    vault: vault.pubkey,
                    owner: vault.owner,
                    vaultName: vault.vaultName,
                    action: 'error',
                    reason: `Trigger failed: ${(errorData as { error?: string }).error || triggerResponse.status}`,
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[CRON] Error triggering vault "${vault.vaultName}":`, message);
            results.push({
                vault: vault.pubkey,
                owner: vault.owner,
                vaultName: vault.vaultName,
                action: 'error',
                reason: message,
            });
        }
    }

    // ── 4. Summary ──────────────────────────────────────────────────────────
    const triggered = results.filter((r) => r.action === 'triggered').length;
    const skipped = results.filter((r) => r.action === 'skipped').length;
    const errors = results.filter((r) => r.action === 'error').length;
    const durationMs = Date.now() - startTime;

    console.log(
        `[CRON] Check-In Monitor complete — ` +
        `${triggered} triggered, ${skipped} ok, ${errors} errors ` +
        `(${durationMs}ms)`
    );

    return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString(),
        durationMs,
        summary: {
            totalVaults: vaults.length,
            triggered,
            skipped,
            errors,
        },
        results,
    });
}
