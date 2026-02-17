use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::VaultTriggered;

/// # Trigger Release
///
/// Callable by ANYONE once the check-in interval has been exceeded.
/// Moves the vault from Active to Triggered state, starting the 30-day grace period.
///
/// ## Trust Assumptions
/// - Anyone can call this — no signer restriction. The trigger is time-based.
/// - The Solana Clock is trusted to determine if interval exceeded.
/// - Grace period is a fixed 30 days from trigger timestamp.
///
/// ## Failure Modes
/// - Vault not Active: `VaultAlreadyTriggered`
/// - Interval not exceeded: `IntervalNotExceeded`
pub fn handle_trigger_release(ctx: Context<TriggerRelease>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Only Active vaults can be triggered
    require!(
        vault.vault_status == VaultStatus::Active,
        LegacyXError::VaultAlreadyTriggered
    );

    let clock = Clock::get()?;

    // Check that the check-in interval has been exceeded
    let deadline = vault.last_check_in
        .checked_add(vault.check_in_interval)
        .ok_or(LegacyXError::ArithmeticOverflow)?;

    require!(
        clock.unix_timestamp > deadline,
        LegacyXError::IntervalNotExceeded
    );

    // Move to Triggered state
    vault.vault_status = VaultStatus::Triggered;
    vault.triggered_at = clock.unix_timestamp;

    let grace_period: i64 = 30 * 24 * 60 * 60; // 30 days
    let grace_period_ends = clock.unix_timestamp
        .checked_add(grace_period)
        .ok_or(LegacyXError::ArithmeticOverflow)?;

    emit!(VaultTriggered {
        vault: vault.key(),
        triggered_by: ctx.accounts.caller.key(),
        triggered_at: clock.unix_timestamp,
        grace_period_ends,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct TriggerRelease<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    /// Anyone can trigger — this is intentionally not restricted to owner.
    pub caller: Signer<'info>,
}
