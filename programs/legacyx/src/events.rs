use anchor_lang::prelude::*;

// ============================================================================
// SOULVAULT ON-CHAIN EVENTS
// Emitted by instructions for off-chain indexing and UI updates.
// ============================================================================

#[event]
pub struct VaultCreated {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub vault_name: String,
    pub check_in_interval: i64,
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
pub struct BeneficiarySet {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub set_at: i64,
}

#[event]
pub struct FileAdded {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub ipfs_cid: String,
    pub file_count: u16,
    pub added_at: i64,
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
    pub beneficiary: Pubkey,
    pub released_at: i64,
    pub file_count: u16,
}
