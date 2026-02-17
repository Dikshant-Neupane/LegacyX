use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::MessageBurned;

/// # Burn Message
///
/// After an heir reads a message, they call this instruction to permanently
/// delete the Arweave CID reference from the on-chain vault. The encrypted
/// data still exists on Arweave (permanent storage), but the reference
/// and key shard access is destroyed — making it effectively unrecoverable.
///
/// ## Trust Assumptions
/// - Caller must be a registered heir.
/// - Vault must be in Released state.
/// - The CID must exist in the vault's arweave_cids vector.
/// - This is IRREVERSIBLE — the CID reference is permanently removed.
///
/// ## Failure Modes
/// - Not an heir: `UnauthorizedBurn`
/// - Vault not released: `VaultNotReleased`
/// - CID not found: `CidNotFound`
pub fn handle_burn_message(ctx: Context<BurnMessage>, cid_to_burn: String) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Vault must be in Released state
    require!(
        vault.vault_status == VaultStatus::Released,
        LegacyXError::VaultNotReleased
    );

    // Verify caller is a registered heir
    let heir_key = ctx.accounts.heir.key();
    require!(
        vault.heir_pubkeys.contains(&heir_key),
        LegacyXError::UnauthorizedBurn
    );

    // Find and remove the CID
    let cid_index = vault
        .arweave_cids
        .iter()
        .position(|cid| *cid == cid_to_burn)
        .ok_or(LegacyXError::CidNotFound)?;

    vault.arweave_cids.remove(cid_index);

    let clock = Clock::get()?;

    // If all CIDs burned, set status to Burned
    if vault.arweave_cids.is_empty() {
        vault.vault_status = VaultStatus::Burned;
    }

    emit!(MessageBurned {
        vault: vault.key(),
        heir: heir_key,
        burned_cid: cid_to_burn,
        burned_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BurnMessage<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub heir: Signer<'info>,
}
