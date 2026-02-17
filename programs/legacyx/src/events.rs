use anchor_lang::prelude::*;

// ============================================================================
// LEGACYX ON-CHAIN EVENTS
// Emitted by instructions for off-chain indexing and UI updates.
// ============================================================================

#[event]
pub struct VaultCreated {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub vault_name: String,
    pub check_in_interval: i64,
    pub heir_count: u8,
    pub created_at: i64,
}

#[event]
pub struct CheckInCompleted {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub checked_in_at: i64,
    pub next_deadline: i64,
}

#[event]
pub struct VaultTriggered {
    pub vault: Pubkey,
    pub triggered_by: Pubkey,
    pub triggered_at: i64,
    pub grace_period_ends: i64,
}

#[event]
pub struct VaultReleased {
    pub vault: Pubkey,
    pub heir: Pubkey,
    pub released_at: i64,
    pub cid_count: u16,
}

#[event]
pub struct MessageBurned {
    pub vault: Pubkey,
    pub heir: Pubkey,
    pub burned_cid: String,
    pub burned_at: i64,
}

#[event]
pub struct ConditionSatisfied {
    pub vault: Pubkey,
    pub heir: Pubkey,
    pub condition_index: u8,
    pub condition_label: String,
    pub satisfied_at: i64,
}

#[event]
pub struct SocialRecoveryInitiated {
    pub vault: Pubkey,
    pub guardian: Pubkey,
    pub proposed_new_owner: Pubkey,
    pub signed_at: i64,
    pub signatures_collected: u8,
    pub threshold: u8,
}

#[event]
pub struct SocialRecoveryCompleted {
    pub vault: Pubkey,
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub completed_at: i64,
}

#[event]
pub struct IdentityProofAnchored {
    pub owner: Pubkey,
    pub face_hash: [u8; 32],
    pub voice_hash: [u8; 32],
    pub proved_at: i64,
}

#[event]
pub struct WhistleblowerBroadcast {
    pub vault: Pubkey,
    pub broadcast_at: i64,
    pub wallet_count: u16,
    pub cid_count: u16,
}

#[event]
pub struct CertificateMinted {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub minted_at: i64,
}

#[event]
pub struct HeirAdded {
    pub vault: Pubkey,
    pub heir: Pubkey,
    pub added_at: i64,
    pub total_heirs: u8,
}

#[event]
pub struct FileAdded {
    pub vault: Pubkey,
    pub arweave_cid: String,
    pub added_at: i64,
    pub total_files: u16,
}
