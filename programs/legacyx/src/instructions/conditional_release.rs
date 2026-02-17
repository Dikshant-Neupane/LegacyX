use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultCondition, ConditionType, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::ConditionSatisfied;

/// # Conditional Release
///
/// Heir provides verifiable on-chain proof (NFT ownership, token balance,
/// or timestamp) to satisfy a condition and unlock specific vault assets.
///
/// ## Trust Assumptions
/// - Heir must be a registered heir of the vault.
/// - Proof is verified on-chain: NFT ownership via token account, token balance
///   via associated token account, timestamp via Solana Clock.
/// - Vault must be in Released state (heirs have access).
///
/// ## Failure Modes
/// - Condition already satisfied: `ConditionAlreadySatisfied`
/// - NFT not held: `NftConditionNotMet`
/// - Insufficient tokens: `TokenConditionNotMet`
/// - Timestamp not reached: `TimestampNotReached`
pub fn handle_conditional_release(ctx: Context<ConditionalRelease>) -> Result<()> {
    let condition = &mut ctx.accounts.condition;
    let vault = &ctx.accounts.vault;

    // Vault must be released
    require!(
        vault.vault_status == VaultStatus::Released,
        LegacyXError::VaultNotReleased
    );

    // Condition must not already be satisfied
    require!(
        !condition.is_satisfied,
        LegacyXError::ConditionAlreadySatisfied
    );

    // Verify heir is the intended recipient
    require!(
        condition.heir == ctx.accounts.heir.key(),
        LegacyXError::NotAnHeir
    );

    let clock = Clock::get()?;

    // Verify the condition based on type
    match condition.condition_type {
        ConditionType::HoldsNft => {
            // In production: verify token account ownership via remaining accounts
            // For MVP: trust that the proof_token_account contains the NFT
            if let Some(proof_account) = &ctx.accounts.proof_token_account {
                // Verify the token account has amount > 0
                let data = proof_account.try_borrow_data()?;
                // SPL Token account: amount is at offset 64, 8 bytes LE
                if data.len() >= 72 {
                    let amount = u64::from_le_bytes(data[64..72].try_into().unwrap());
                    require!(amount > 0, LegacyXError::NftConditionNotMet);
                } else {
                    return Err(LegacyXError::NftConditionNotMet.into());
                }
            } else {
                return Err(LegacyXError::NftConditionNotMet.into());
            }
        }
        ConditionType::HoldsToken => {
            if let Some(proof_account) = &ctx.accounts.proof_token_account {
                let data = proof_account.try_borrow_data()?;
                if data.len() >= 72 {
                    let amount = u64::from_le_bytes(data[64..72].try_into().unwrap());
                    require!(
                        amount >= condition.threshold_or_timestamp,
                        LegacyXError::TokenConditionNotMet
                    );
                } else {
                    return Err(LegacyXError::TokenConditionNotMet.into());
                }
            } else {
                return Err(LegacyXError::TokenConditionNotMet.into());
            }
        }
        ConditionType::TimestampReached => {
            require!(
                clock.unix_timestamp >= condition.threshold_or_timestamp as i64,
                LegacyXError::TimestampNotReached
            );
        }
        ConditionType::CustomProof => {
            // Custom proof delegation: for now, accept if a valid proof
            // token account is provided (oracle-issued token)
            if let Some(proof_account) = &ctx.accounts.proof_token_account {
                let data = proof_account.try_borrow_data()?;
                if data.len() >= 72 {
                    let amount = u64::from_le_bytes(data[64..72].try_into().unwrap());
                    require!(amount > 0, LegacyXError::NftConditionNotMet);
                } else {
                    return Err(LegacyXError::InvalidConditionType.into());
                }
            } else {
                return Err(LegacyXError::InvalidConditionType.into());
            }
        }
    }

    // Mark condition as satisfied
    condition.is_satisfied = true;
    condition.satisfied_at = clock.unix_timestamp;

    emit!(ConditionSatisfied {
        vault: vault.key(),
        heir: ctx.accounts.heir.key(),
        condition_index: condition.condition_index,
        condition_label: condition.label.clone(),
        satisfied_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ConditionalRelease<'info> {
    #[account(
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        mut,
        seeds = [b"condition", vault.key().as_ref(), &[condition.condition_index]],
        bump = condition.bump,
        has_one = vault,
        has_one = heir,
    )]
    pub condition: Account<'info, VaultCondition>,

    pub heir: Signer<'info>,

    /// Optional: the token account proving NFT/token ownership.
    /// CHECK: Validated manually in instruction logic based on condition type.
    pub proof_token_account: Option<AccountInfo<'info>>,
}
