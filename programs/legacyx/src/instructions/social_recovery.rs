use anchor_lang::prelude::*;
use crate::state::{VaultAccount, GuardianRecord};
use crate::errors::LegacyXError;
use crate::events::{SocialRecoveryInitiated, SocialRecoveryCompleted};

/// # Social Recovery
///
/// Implements M-of-N Phantom Wallet guardian multisig to reassign vault
/// ownership when the original owner loses wallet access.
///
/// ## Trust Assumptions
/// - Only registered guardians can sign.
/// - Each guardian independently signs with their own Phantom Wallet.
/// - All guardians must agree on the SAME proposed new owner.
/// - Once threshold is reached, ownership transfers immediately.
/// - The old owner's Phantom Wallet is fully replaced.
///
/// ## Failure Modes
/// - Not a guardian: `NotAGuardian`
/// - Already signed: `GuardianAlreadySigned`
/// - Proposed new owner is current owner: `NewOwnerIsCurrent`
/// - Threshold not reached: instruction succeeds but transfer deferred
pub fn handle_social_recovery<'info>(
    ctx: Context<'_, '_, 'info, 'info, SocialRecovery<'info>>,
    proposed_new_owner: Pubkey,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let guardian_record = &mut ctx.accounts.guardian_record;

    let guardian_key = ctx.accounts.guardian.key();

    // Verify the signer is a registered guardian
    require!(
        vault.guardian_pubkeys.contains(&guardian_key),
        LegacyXError::NotAGuardian
    );

    // Cannot recover to the same owner
    require!(
        proposed_new_owner != vault.owner,
        LegacyXError::NewOwnerIsCurrent
    );

    // Guardian must not have already signed
    require!(
        !guardian_record.has_signed,
        LegacyXError::GuardianAlreadySigned
    );

    let clock = Clock::get()?;

    // Record guardian's signature
    guardian_record.vault = vault.key();
    guardian_record.guardian = guardian_key;
    guardian_record.has_signed = true;
    guardian_record.signed_at = clock.unix_timestamp;
    guardian_record.proposed_new_owner = proposed_new_owner;
    guardian_record.bump = ctx.bumps.guardian_record;

    // Count signatures for the same proposed new owner
    // NOTE: In production, we'd iterate all guardian records.
    // For MVP, we track count via remaining accounts.
    let mut signature_count: u8 = 1; // This guardian just signed

    // Check remaining accounts for other guardian records that have signed
    // for the same proposed_new_owner
    for account_info in ctx.remaining_accounts.iter() {
        if let Ok(record) = Account::<GuardianRecord>::try_from(account_info) {
            if record.vault == vault.key()
                && record.has_signed
                && record.proposed_new_owner == proposed_new_owner
                && record.guardian != guardian_key // Don't count self twice
            {
                signature_count = signature_count
                    .checked_add(1)
                    .ok_or(LegacyXError::ArithmeticOverflow)?;
            }
        }
    }

    emit!(SocialRecoveryInitiated {
        vault: vault.key(),
        guardian: guardian_key,
        proposed_new_owner,
        signed_at: clock.unix_timestamp,
        signatures_collected: signature_count,
        threshold: vault.recovery_threshold,
    });

    // If threshold reached, transfer ownership
    if signature_count >= vault.recovery_threshold {
        let old_owner = vault.owner;
        vault.owner = proposed_new_owner;

        emit!(SocialRecoveryCompleted {
            vault: vault.key(),
            old_owner,
            new_owner: proposed_new_owner,
            completed_at: clock.unix_timestamp,
        });
    }

    Ok(())
}

#[derive(Accounts)]
pub struct SocialRecovery<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        init_if_needed,
        payer = guardian,
        space = GuardianRecord::SPACE,
        seeds = [b"guardian", vault.key().as_ref(), guardian.key().as_ref()],
        bump
    )]
    pub guardian_record: Account<'info, GuardianRecord>,

    #[account(mut)]
    pub guardian: Signer<'info>,

    pub system_program: Program<'info, System>,
}
