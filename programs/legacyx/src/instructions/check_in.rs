use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::CheckInCompleted;

/// # Check In
///
/// Owner signs a transaction to prove they are alive. Resets the last_check_in
/// timestamp. If vault was in Triggered state (grace period), moves it back to Active.
///
/// ## Trust Assumptions
/// - Only the vault owner (Phantom Wallet signer) can check in.
/// - The Solana Clock is trusted for timestamp.
/// - Check-in is allowed in Active or Triggered (grace period) states only.
///
/// ## Failure Modes
/// - Wrong signer: `UnauthorizedCheckIn`
/// - Vault in Released or Burned state: `CheckInNotAllowed`
pub fn handle_check_in(ctx: Context<CheckIn>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Verify the signer is the vault owner
    require!(
        vault.owner == ctx.accounts.owner.key(),
        LegacyXError::UnauthorizedCheckIn
    );

    // Check-in allowed only in Active or Triggered (grace period) states
    require!(
        vault.vault_status == VaultStatus::Active || vault.vault_status == VaultStatus::Triggered,
        LegacyXError::CheckInNotAllowed
    );

    let clock = Clock::get()?;

    // Reset check-in timestamp
    vault.last_check_in = clock.unix_timestamp;

    // If vault was triggered (in grace period), move back to Active
    if vault.vault_status == VaultStatus::Triggered {
        vault.vault_status = VaultStatus::Active;
        vault.triggered_at = 0;
    }

    let next_deadline = clock.unix_timestamp
        .checked_add(vault.check_in_interval)
        .ok_or(LegacyXError::ArithmeticOverflow)?;

    emit!(CheckInCompleted {
        owner: ctx.accounts.owner.key(),
        vault: vault.key(),
        checked_in_at: clock.unix_timestamp,
        next_deadline,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ LegacyXError::UnauthorizedCheckIn,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub owner: Signer<'info>,
}
