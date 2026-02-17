use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::VaultReleased;

/// # Release to Heir
///
/// After the vault has been triggered AND the 30-day grace period has expired,
/// this instruction distributes encrypted key shards to heir wallet pubkeys
/// and updates vault_status to Released.
///
/// ## Trust Assumptions
/// - Caller must be a registered heir of the vault.
/// - Grace period (30 days from trigger) must have fully expired.
/// - Key shards are already encrypted — this only marks them as released.
///
/// ## Failure Modes
/// - Vault not Triggered: `VaultNotTriggered`
/// - Grace period not expired: `GracePeriodNotExpired`
/// - Caller not an heir: `NotAnHeir`
pub fn handle_release_to_heir(ctx: Context<ReleaseToHeir>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Vault must be in Triggered state
    require!(
        vault.vault_status == VaultStatus::Triggered,
        LegacyXError::VaultNotTriggered
    );

    // Verify caller is a registered heir
    let heir_key = ctx.accounts.heir.key();
    require!(
        vault.heir_pubkeys.contains(&heir_key),
        LegacyXError::NotAnHeir
    );

    let clock = Clock::get()?;

    // Grace period: 30 days from trigger
    let grace_period: i64 = 30 * 24 * 60 * 60;
    let grace_end = vault.triggered_at
        .checked_add(grace_period)
        .ok_or(LegacyXError::ArithmeticOverflow)?;

    require!(
        clock.unix_timestamp > grace_end,
        LegacyXError::GracePeriodNotExpired
    );

    // Release: update status
    vault.vault_status = VaultStatus::Released;

    emit!(VaultReleased {
        vault: vault.key(),
        heir: heir_key,
        released_at: clock.unix_timestamp,
        cid_count: vault.arweave_cids.len() as u16,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ReleaseToHeir<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub heir: Signer<'info>,
}
