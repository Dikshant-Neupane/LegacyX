use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::SoulVaultError;
use crate::events::VaultReleased;

/// # Release to Beneficiary
///
/// After trigger + 30-day grace period, the beneficiary claims the vault.
/// Moves vault to Released state permanently.
///
/// ## Trust Assumptions
/// - Only the registered beneficiary can call this.
/// - Vault must be in Triggered state.
/// - 30-day grace period must have fully elapsed.
/// - The Solana Clock is trusted for timestamp comparison.
///
/// ## Failure Modes
/// - Vault not Triggered: `VaultNotTriggered`
/// - Grace period not expired: `GracePeriodNotExpired`
/// - No beneficiary: `NoBeneficiarySet`
/// - Caller is not the beneficiary: `NotBeneficiary`
pub fn handle_release_to_beneficiary(ctx: Context<ReleaseToBeneficiary>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Vault must be Triggered
    require!(
        vault.vault_status == VaultStatus::Triggered,
        SoulVaultError::VaultNotTriggered
    );

    // Must have a beneficiary
    let beneficiary_key = vault.beneficiary.ok_or(SoulVaultError::NoBeneficiarySet)?;

    // Caller must be the beneficiary
    require!(
        ctx.accounts.beneficiary.key() == beneficiary_key,
        SoulVaultError::NotBeneficiary
    );

    let clock = Clock::get()?;

    // Grace period must have expired
    let grace_end = vault.triggered_at
        .checked_add(VaultAccount::GRACE_PERIOD)
        .ok_or(SoulVaultError::ArithmeticOverflow)?;

    require!(
        clock.unix_timestamp > grace_end,
        SoulVaultError::GracePeriodNotExpired
    );

    // Release the vault
    vault.vault_status = VaultStatus::Released;

    emit!(VaultReleased {
        vault: vault.key(),
        beneficiary: ctx.accounts.beneficiary.key(),
        released_at: clock.unix_timestamp,
        file_count: vault.file_count,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ReleaseToBeneficiary<'info> {
    #[account(
        mut,
        seeds = [b"soulvault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    /// The beneficiary claiming the vault.
    pub beneficiary: Signer<'info>,
}
