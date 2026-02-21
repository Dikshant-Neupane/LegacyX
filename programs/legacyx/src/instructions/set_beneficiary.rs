use anchor_lang::prelude::*;
use crate::state::VaultAccount;
use crate::errors::SoulVaultError;
use crate::events::BeneficiarySet;

/// # Set Beneficiary
///
/// Owner sets or updates the single beneficiary of the vault.
/// The beneficiary receives access to vault contents when the vault is released.
///
/// ## Trust Assumptions
/// - Only the vault owner can set the beneficiary (Anchor `has_one` + Signer).
/// - Beneficiary cannot be the owner themselves.
///
/// ## Failure Modes
/// - Wrong signer: Anchor constraint rejects.
/// - Beneficiary is the owner: `BeneficiaryIsOwner`.
pub fn handle_set_beneficiary(
    ctx: Context<SetBeneficiary>,
    beneficiary: Pubkey,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Beneficiary cannot be the owner
    require!(
        beneficiary != ctx.accounts.owner.key(),
        SoulVaultError::BeneficiaryIsOwner
    );

    let clock = Clock::get()?;

    vault.beneficiary = Some(beneficiary);

    emit!(BeneficiarySet {
        vault: vault.key(),
        owner: ctx.accounts.owner.key(),
        beneficiary,
        set_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SetBeneficiary<'info> {
    #[account(
        mut,
        seeds = [b"soulvault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ SoulVaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub owner: Signer<'info>,
}
