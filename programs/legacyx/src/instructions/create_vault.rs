use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::SoulVaultError;
use crate::events::VaultCreated;

/// # Create Vault
///
/// Initializes a new SoulVault PDA for the connecting Phantom Wallet owner.
///
/// ## Trust Assumptions
/// - The `owner` signer is the Phantom Wallet holder — verified by Anchor's `Signer` constraint.
/// - Check-in interval is validated: 30–365 days.
/// - Vault PDA is deterministically derived from `["soulvault", owner.key()]`.
/// - One vault per wallet enforced by PDA uniqueness.
///
/// ## Failure Modes
/// - Owner already has a vault: Anchor `init` fails (PDA exists).
/// - Check-in interval out of range: `InvalidCheckInInterval`.
/// - Vault name too long: `VaultNameTooLong`.
/// - Vault name empty: `VaultNameEmpty`.
/// - Beneficiary is owner: `BeneficiaryIsOwner`.
pub fn handle_create_vault(
    ctx: Context<CreateVault>,
    vault_name: String,
    check_in_interval: i64,
    beneficiary: Option<Pubkey>,
) -> Result<()> {
    // Validate vault name
    require!(!vault_name.is_empty(), SoulVaultError::VaultNameEmpty);
    require!(
        vault_name.len() <= VaultAccount::MAX_VAULT_NAME,
        SoulVaultError::VaultNameTooLong
    );

    // Validate check-in interval: 30–365 days in seconds
    require!(
        check_in_interval >= VaultAccount::MIN_CHECK_IN_INTERVAL
            && check_in_interval <= VaultAccount::MAX_CHECK_IN_INTERVAL,
        SoulVaultError::InvalidCheckInInterval
    );

    // Validate beneficiary != owner
    if let Some(ben) = beneficiary {
        require!(
            ben != ctx.accounts.owner.key(),
            SoulVaultError::BeneficiaryIsOwner
        );
    }

    let clock = Clock::get()?;
    let vault = &mut ctx.accounts.vault;

    vault.owner = ctx.accounts.owner.key();
    vault.vault_name = vault_name.clone();
    vault.vault_status = VaultStatus::Active;
    vault.check_in_interval = check_in_interval;
    vault.last_check_in = clock.unix_timestamp;
    vault.triggered_at = 0;
    vault.beneficiary = beneficiary;
    vault.ipfs_cids = Vec::new();
    vault.file_count = 0;
    vault.created_at = clock.unix_timestamp;
    vault.bump = ctx.bumps.vault;

    emit!(VaultCreated {
        owner: ctx.accounts.owner.key(),
        vault: vault.key(),
        vault_name,
        check_in_interval,
        created_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = owner,
        space = VaultAccount::SPACE,
        seeds = [b"soulvault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
