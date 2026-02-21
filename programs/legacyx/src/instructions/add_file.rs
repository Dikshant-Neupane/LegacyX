use anchor_lang::prelude::*;
use crate::state::{VaultAccount, VaultStatus};
use crate::errors::SoulVaultError;
use crate::events::FileAdded;

/// # Add File
///
/// Owner stores an encrypted IPFS CID reference on-chain.
/// The actual encrypted file lives on IPFS — only the CID is stored here.
///
/// ## Trust Assumptions
/// - Only the vault owner can add files (Anchor `has_one` + Signer).
/// - CID is validated for length (max 64 chars) and non-empty.
/// - Vault must be Active to add files.
/// - Maximum 50 CIDs per vault.
///
/// ## SECURITY
/// - The CID itself reveals nothing — files are AES-256-GCM encrypted
///   client-side before upload to IPFS.
/// - No encryption key material touches this program.
pub fn handle_add_file(
    ctx: Context<AddFile>,
    ipfs_cid: String,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Vault must be Active
    require!(
        vault.vault_status == VaultStatus::Active,
        SoulVaultError::VaultNotActiveForFile
    );

    // Validate CID
    require!(!ipfs_cid.is_empty(), SoulVaultError::CidEmpty);
    require!(
        ipfs_cid.len() <= VaultAccount::MAX_CID_LEN,
        SoulVaultError::CidTooLong
    );

    // Check capacity
    require!(
        vault.ipfs_cids.len() < VaultAccount::MAX_CIDS,
        SoulVaultError::TooManyCids
    );

    let clock = Clock::get()?;

    vault.ipfs_cids.push(ipfs_cid.clone());
    vault.file_count = vault.ipfs_cids.len() as u16;

    emit!(FileAdded {
        vault: vault.key(),
        owner: ctx.accounts.owner.key(),
        ipfs_cid,
        file_count: vault.file_count,
        added_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AddFile<'info> {
    #[account(
        mut,
        seeds = [b"soulvault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ SoulVaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultAccount>,

    pub owner: Signer<'info>,
}
