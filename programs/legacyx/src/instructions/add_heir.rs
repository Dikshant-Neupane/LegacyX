use anchor_lang::prelude::*;
use crate::state::VaultAccount;
use crate::errors::LegacyXError;
use crate::events::{HeirAdded, FileAdded};

/// # Add Heir
///
/// Add a new heir to an existing vault.
///
/// ## Trust Assumptions
/// - Only the vault owner can add heirs.
/// - Vault must be Active.
/// - Maximum 10 heirs enforced.
///
/// ## Failure Modes
/// - Not owner: `UnauthorizedCheckIn` (reused — same authorization check)
/// - Too many heirs: `TooManyHeirs`
/// - Heir is owner: `HeirIsOwner`
pub fn handle_add_heir(ctx: Context<AddHeir>, heir_pubkey: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(
        vault.vault_status == crate::state::VaultStatus::Active,
        LegacyXError::VaultNotActive
    );

    require!(
        vault.heir_pubkeys.len() < VaultAccount::MAX_HEIRS,
        LegacyXError::TooManyHeirs
    );

    require!(
        heir_pubkey != ctx.accounts.owner.key(),
        LegacyXError::HeirIsOwner
    );

    vault.heir_pubkeys.push(heir_pubkey);

    let clock = Clock::get()?;

    emit!(HeirAdded {
        vault: vault.key(),
        heir: heir_pubkey,
        added_at: clock.unix_timestamp,
        total_heirs: vault.heir_pubkeys.len() as u8,
    });

    Ok(())
}

/// # Add File (Store Arweave CID)
///
/// After client-side encryption and Arweave upload, store the CID on-chain.
///
/// ## Trust Assumptions
/// - Only the vault owner can add files.
/// - The CID references an already-encrypted file on Arweave.
/// - Server never saw the unencrypted file.
///
/// ## Failure Modes
/// - Not owner: authorization error
/// - Too many CIDs: `TooManyCids`
/// - CID too long: `CidTooLong`
pub fn handle_add_file(
    ctx: Context<AddFile>,
    arweave_cid: String,
    encrypted_key_shard: Option<String>,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(
        vault.vault_status == crate::state::VaultStatus::Active,
        LegacyXError::VaultNotActive
    );

    require!(
        arweave_cid.len() <= VaultAccount::MAX_CID_LEN,
        LegacyXError::CidTooLong
    );

    require!(
        vault.arweave_cids.len() < VaultAccount::MAX_CIDS,
        LegacyXError::TooManyCids
    );

    if let Some(ref shard) = encrypted_key_shard {
        require!(
            shard.len() <= VaultAccount::MAX_SHARD_LEN,
            LegacyXError::ShardTooLong
        );
        vault.encrypted_key_shards.push(shard.clone());
    }

    vault.arweave_cids.push(arweave_cid.clone());

    let clock = Clock::get()?;

    emit!(FileAdded {
        vault: vault.key(),
        arweave_cid,
        added_at: clock.unix_timestamp,
        total_files: vault.arweave_cids.len() as u16,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AddHeir<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ LegacyXError::UnauthorizedCheckIn,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddFile<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ LegacyXError::UnauthorizedCheckIn,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub owner: Signer<'info>,
}
