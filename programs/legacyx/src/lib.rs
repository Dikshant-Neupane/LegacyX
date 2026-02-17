use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("LGCYxV1111111111111111111111111111111111111");

#[program]
pub mod legacyx {
    use super::*;

    // ========================================================================
    // CORE VAULT LIFECYCLE
    // ========================================================================

    /// Initialize a new vault PDA for the owner's Phantom Wallet.
    /// Emits: VaultCreated
    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_name: String,
        check_in_interval: i64,
        heir_pubkeys: Vec<Pubkey>,
        guardian_pubkeys: Vec<Pubkey>,
        recovery_threshold: u8,
    ) -> Result<()> {
        instructions::create_vault::handle_create_vault(
            ctx,
            vault_name,
            check_in_interval,
            heir_pubkeys,
            guardian_pubkeys,
            recovery_threshold,
        )
    }

    /// Owner proves they are alive by signing a check-in transaction.
    /// Resets the last_check_in timestamp. If vault was Triggered (grace period),
    /// moves it back to Active.
    /// Emits: CheckInCompleted
    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        instructions::check_in::handle_check_in(ctx)
    }

    /// Anyone can call after check_in_interval exceeded. Starts 30-day grace period.
    /// Emits: VaultTriggered
    pub fn trigger_release(ctx: Context<TriggerRelease>) -> Result<()> {
        instructions::trigger_release::handle_trigger_release(ctx)
    }

    /// After trigger + grace period, heir claims the vault.
    /// Emits: VaultReleased
    pub fn release_to_heir(ctx: Context<ReleaseToHeir>) -> Result<()> {
        instructions::release_to_heir::handle_release_to_heir(ctx)
    }

    // ========================================================================
    // ADVANCED FEATURES
    // ========================================================================

    /// Heir proves condition (NFT, token, timestamp) to unlock specific assets.
    /// Emits: ConditionSatisfied
    pub fn conditional_release(ctx: Context<ConditionalRelease>) -> Result<()> {
        instructions::conditional_release::handle_conditional_release(ctx)
    }

    /// Heir burns a message after reading — CID permanently removed from chain.
    /// Emits: MessageBurned
    pub fn burn_message(ctx: Context<BurnMessage>, cid_to_burn: String) -> Result<()> {
        instructions::burn_message::handle_burn_message(ctx, cid_to_burn)
    }

    /// Guardian signs for social recovery. M-of-N threshold transfers ownership.
    /// Emits: SocialRecoveryInitiated, SocialRecoveryCompleted (if threshold met)
    pub fn social_recovery(
        ctx: Context<SocialRecovery>,
        proposed_new_owner: Pubkey,
    ) -> Result<()> {
        instructions::social_recovery::handle_social_recovery(ctx, proposed_new_owner)
    }

    /// Anchor biometric SHA-256 hash on-chain with Solana timestamp.
    /// Anti-deepfake proof of identity.
    /// Emits: IdentityProofAnchored
    pub fn identity_proof(
        ctx: Context<IdentityProofAccounts>,
        face_hash: [u8; 32],
        voice_hash: [u8; 32],
    ) -> Result<()> {
        instructions::identity_proof::handle_identity_proof(ctx, face_hash, voice_hash)
    }

    /// Configure whistleblower broadcast wallet list.
    pub fn configure_whistleblower(
        ctx: Context<ConfigureWhistleblower>,
        broadcast_wallets: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::whistleblower::handle_configure_whistleblower(ctx, broadcast_wallets)
    }

    /// Execute whistleblower broadcast — IRREVERSIBLE.
    /// Emits: WhistleblowerBroadcast
    pub fn whistleblower_broadcast(ctx: Context<WhistleblowerBroadcastAccounts>) -> Result<()> {
        instructions::whistleblower::handle_whistleblower_broadcast(ctx)
    }

    /// Mint a Token Extension NFT certificate as proof of vault existence.
    /// Emits: CertificateMinted
    pub fn mint_certificate(ctx: Context<MintCertificate>) -> Result<()> {
        instructions::mint_certificate::handle_mint_certificate(ctx)
    }

    // ========================================================================
    // VAULT MANAGEMENT
    // ========================================================================

    /// Add a new heir to the vault.
    /// Emits: HeirAdded
    pub fn add_heir(ctx: Context<AddHeir>, heir_pubkey: Pubkey) -> Result<()> {
        instructions::add_heir::handle_add_heir(ctx, heir_pubkey)
    }

    /// Store an encrypted Arweave CID on the vault PDA.
    /// Emits: FileAdded
    pub fn add_file(
        ctx: Context<AddFile>,
        arweave_cid: String,
        encrypted_key_shard: Option<String>,
    ) -> Result<()> {
        instructions::add_heir::handle_add_file(ctx, arweave_cid, encrypted_key_shard)
    }
}
