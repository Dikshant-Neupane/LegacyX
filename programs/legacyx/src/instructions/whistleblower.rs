use anchor_lang::prelude::*;
use crate::state::{VaultAccount, WhistleblowerConfig, VaultStatus};
use crate::errors::LegacyXError;
use crate::events::WhistleblowerBroadcast;

/// # Whistleblower Vault (Broadcast)
///
/// If the vault has entered Triggered state and whistleblower is enabled,
/// this instruction auto-broadcasts all encrypted CIDs to pre-configured
/// wallet addresses. This is IRREVERSIBLE once executed.
///
/// ## Trust Assumptions
/// - Vault must be in Triggered state.
/// - Whistleblower must be enabled on the vault.
/// - Broadcast wallets must be pre-configured.
/// - Anyone can call this once conditions are met — it's a dead-man's switch.
/// - The broadcast is on-chain: CIDs are emitted in an event that indexers pick up.
///
/// ## Failure Modes
/// - Vault not triggered: `VaultNotTriggeredForBroadcast`
/// - Already broadcast: `AlreadyBroadcast`
/// - No broadcast wallets: `NoBroadcastWallets`
pub fn handle_whistleblower_broadcast(ctx: Context<WhistleblowerBroadcastAccounts>) -> Result<()> {
    let vault = &ctx.accounts.vault;
    let config = &mut ctx.accounts.whistleblower_config;

    // Vault must be triggered
    require!(
        vault.vault_status == VaultStatus::Triggered,
        LegacyXError::VaultNotTriggeredForBroadcast
    );

    // Must not have already broadcast
    require!(
        !config.has_broadcast,
        LegacyXError::AlreadyBroadcast
    );

    // Must have broadcast wallets configured
    require!(
        !config.broadcast_wallets.is_empty(),
        LegacyXError::NoBroadcastWallets
    );

    let clock = Clock::get()?;

    // Mark as broadcast — IRREVERSIBLE
    config.has_broadcast = true;
    config.broadcast_at = clock.unix_timestamp;

    // Emit broadcast event — indexers and notification services
    // will pick this up and send the CIDs to all broadcast wallets.
    // The CIDs are encrypted — recipients need key shards to decrypt.
    emit!(WhistleblowerBroadcast {
        vault: vault.key(),
        broadcast_at: clock.unix_timestamp,
        wallet_count: config.broadcast_wallets.len() as u16,
        cid_count: vault.arweave_cids.len() as u16,
    });

    Ok(())
}

/// # Configure Whistleblower
///
/// Owner sets up the broadcast wallet list for the whistleblower dead-man's switch.
pub fn handle_configure_whistleblower(
    ctx: Context<ConfigureWhistleblower>,
    broadcast_wallets: Vec<Pubkey>,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let config = &mut ctx.accounts.whistleblower_config;

    // Only Active vaults can be configured
    require!(
        vault.vault_status == VaultStatus::Active,
        LegacyXError::VaultNotActive
    );

    // Validate wallet count
    require!(
        broadcast_wallets.len() <= WhistleblowerConfig::MAX_WALLETS_PER_ACCOUNT,
        LegacyXError::TooManyBroadcastWallets
    );

    config.vault = vault.key();
    config.broadcast_wallets = broadcast_wallets;
    config.has_broadcast = false;
    config.broadcast_at = 0;
    config.bump = ctx.bumps.whistleblower_config;

    // Enable whistleblower on the vault
    vault.whistleblower_enabled = true;

    Ok(())
}

#[derive(Accounts)]
pub struct WhistleblowerBroadcastAccounts<'info> {
    #[account(
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        mut,
        seeds = [b"whistleblower", vault.key().as_ref()],
        bump = whistleblower_config.bump,
        has_one = vault,
    )]
    pub whistleblower_config: Account<'info, WhistleblowerConfig>,

    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ConfigureWhistleblower<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ LegacyXError::UnauthorizedCheckIn,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        space = WhistleblowerConfig::SPACE,
        seeds = [b"whistleblower", vault.key().as_ref()],
        bump
    )]
    pub whistleblower_config: Account<'info, WhistleblowerConfig>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
