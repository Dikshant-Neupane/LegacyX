use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::VaultCreated;

/// # Create Vault
///
/// Initializes a new vault PDA for the connecting Phantom Wallet owner.
///
/// ## Trust Assumptions
/// - The `owner` signer is the Phantom Wallet holder — verified by Anchor's `Signer` constraint.
/// - Check-in interval is validated to be within 30 days to 5 years.
/// - Heirs cannot include the owner's own pubkey.
/// - Vault PDA is deterministically derived from `["vault", owner.key()]`.
///
/// ## Failure Modes
/// - If the owner already has a vault: Anchor account init fails (PDA already exists).
/// - If check-in interval is out of range: `InvalidCheckInInterval`.
/// - If no heirs provided: `NoHeirsProvided`.
/// - If too many heirs: `TooManyHeirs`.
/// - If heir is the owner: `HeirIsOwner`.
/// - If vault name is too long: `VaultNameTooLong`.
pub fn handle_create_vault(
    ctx: Context<CreateVault>,
    vault_name: String,
    check_in_interval: i64,
    heir_pubkeys: Vec<Pubkey>,
    guardian_pubkeys: Vec<Pubkey>,
    recovery_threshold: u8,
) -> Result<()> {
    // Validate vault name length
    require!(
        vault_name.len() <= VaultAccount::MAX_VAULT_NAME,
        LegacyXError::VaultNameTooLong
    );

    // Validate check-in interval: 30 days to 5 years in seconds
    let thirty_days: i64 = 30 * 24 * 60 * 60;
    let five_years: i64 = 5 * 365 * 24 * 60 * 60;
    require!(
        check_in_interval >= thirty_days && check_in_interval <= five_years,
        LegacyXError::InvalidCheckInInterval
    );

    // Validate heirs
    require!(!heir_pubkeys.is_empty(), LegacyXError::NoHeirsProvided);
    require!(
        heir_pubkeys.len() <= VaultAccount::MAX_HEIRS,
        LegacyXError::TooManyHeirs
    );
    for heir in &heir_pubkeys {
        require!(
            *heir != ctx.accounts.owner.key(),
            LegacyXError::HeirIsOwner
        );
    }

    // Validate guardians
    require!(
        guardian_pubkeys.len() <= VaultAccount::MAX_GUARDIANS,
        LegacyXError::TooManyGuardians
    );
    if !guardian_pubkeys.is_empty() {
        require!(
            recovery_threshold >= 1 && (recovery_threshold as usize) <= guardian_pubkeys.len(),
            LegacyXError::InvalidRecoveryThreshold
        );
    }

    let clock = Clock::get()?;
    let vault = &mut ctx.accounts.vault;

    vault.owner = ctx.accounts.owner.key();
    vault.heir_pubkeys = heir_pubkeys.clone();
    vault.check_in_interval = check_in_interval;
    vault.last_check_in = clock.unix_timestamp;
    vault.triggered_at = 0;
    vault.vault_status = VaultStatus::Active;
    vault.arweave_cids = Vec::new();
    vault.encrypted_key_shards = Vec::new();
    vault.guardian_pubkeys = guardian_pubkeys;
    vault.recovery_threshold = recovery_threshold;
    vault.whistleblower_enabled = false;
    vault.vault_name = vault_name.clone();
    vault.certificate_mint = None;
    vault.created_at = clock.unix_timestamp;
    vault.bump = ctx.bumps.vault;

    emit!(VaultCreated {
        owner: ctx.accounts.owner.key(),
        vault: vault.key(),
        vault_name,
        check_in_interval,
        heir_count: heir_pubkeys.len() as u8,
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
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
