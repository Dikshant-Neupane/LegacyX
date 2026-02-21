use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("XKKXHcAFTJJdGD9eQVmQkHBUEdtzWjvPamPiN2Lveqz");

#[program]
pub mod legacyx {
    use super::*;

    // ========================================================================
    // SOULVAULT — CORE INSTRUCTIONS
    // ========================================================================

    /// Initialize a new SoulVault PDA for the owner's Phantom Wallet.
    /// Seeds: ["soulvault", owner_pubkey]
    /// Emits: VaultCreated
    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_name: String,
        check_in_interval: i64,
        beneficiary: Option<Pubkey>,
    ) -> Result<()> {
        instructions::create_vault::handle_create_vault(ctx, vault_name, check_in_interval, beneficiary)
    }

    /// Owner proves they are alive by signing a check-in transaction.
    /// Resets the last_check_in timestamp. If vault was Triggered (grace period),
    /// moves it back to Active.
    /// Emits: CheckInCompleted
    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        instructions::check_in::handle_check_in(ctx)
    }

    /// Owner sets or updates the single beneficiary who will receive vault access.
    /// Emits: BeneficiarySet
    pub fn set_beneficiary(ctx: Context<SetBeneficiary>, beneficiary: Pubkey) -> Result<()> {
        instructions::set_beneficiary::handle_set_beneficiary(ctx, beneficiary)
    }

    /// Owner stores an encrypted IPFS CID reference on the vault PDA.
    /// Emits: FileAdded
    pub fn add_file(ctx: Context<AddFile>, ipfs_cid: String) -> Result<()> {
        instructions::add_file::handle_add_file(ctx, ipfs_cid)
    }

    /// Anyone can call after check_in_interval exceeded. Starts 30-day grace period.
    /// Emits: VaultTriggered
    pub fn trigger_release(ctx: Context<TriggerRelease>) -> Result<()> {
        instructions::trigger_release::handle_trigger_release(ctx)
    }

    /// After trigger + 30-day grace period, beneficiary claims the vault.
    /// Emits: VaultReleased
    pub fn release_to_beneficiary(ctx: Context<ReleaseToBeneficiary>) -> Result<()> {
        instructions::release_to_beneficiary::handle_release_to_beneficiary(ctx)
    }
}
