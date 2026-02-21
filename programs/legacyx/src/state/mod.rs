use anchor_lang::prelude::*;

// ============================================================================
// VAULT STATUS ENUM
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum VaultStatus {
    /// Vault is active — owner is alive and checking in
    Active,
    /// Check-in interval exceeded — 30-day grace period started
    Triggered,
    /// Grace period expired — assets released to beneficiary
    Released,
}

impl Default for VaultStatus {
    fn default() -> Self {
        VaultStatus::Active
    }
}

// ============================================================================
// VAULT ACCOUNT — Primary PDA
// Seeds: ["soulvault", owner_pubkey]
// ============================================================================

/// The main vault account. One per user. Stores vault configuration,
/// beneficiary, check-in state, and references to encrypted IPFS data.
///
/// SECURITY: This account NEVER contains raw files, encryption keys, or
/// private data. Only IPFS CIDs (content identifiers) and on-chain state.
#[account]
#[derive(Default)]
pub struct VaultAccount {
    /// The Phantom Wallet public key of the vault owner.
    /// This is the SOLE authority — no email, no OAuth.
    pub owner: Pubkey,

    /// Human-readable vault name (display only, not sensitive).
    /// Maximum 32 bytes UTF-8.
    pub vault_name: String,

    /// Current vault lifecycle state: Active → Triggered → Released.
    pub vault_status: VaultStatus,

    /// Check-in interval in seconds. Owner must sign a check_in transaction
    /// within this interval or the vault enters Triggered state.
    /// Range: 30 days (2_592_000) to 365 days (31_536_000)
    pub check_in_interval: i64,

    /// Unix timestamp of the last successful check-in.
    /// Set to current clock timestamp on create_vault and each check_in.
    pub last_check_in: i64,

    /// Timestamp when the vault was triggered (check-in missed).
    /// Zero if vault has not been triggered.
    pub triggered_at: i64,

    /// Single beneficiary wallet — receives vault access on release.
    /// None if no beneficiary has been set yet.
    pub beneficiary: Option<Pubkey>,

    /// IPFS Content IDs (CIDs) of encrypted files stored on IPFS.
    /// Each CID is a base32/base58 string (typically 46-59 chars).
    /// Maximum 50 CIDs per vault.
    pub ipfs_cids: Vec<String>,

    /// Total count of files stored (matches ipfs_cids.len()).
    pub file_count: u16,

    /// Unix timestamp when the vault was created.
    pub created_at: i64,

    /// Bump seed for this PDA — stored for efficient re-derivation.
    pub bump: u8,
}

impl VaultAccount {
    pub const MAX_VAULT_NAME: usize = 32;
    pub const MAX_CIDS: usize = 50;
    pub const MAX_CID_LEN: usize = 64;

    /// 30-day grace period in seconds after vault is triggered.
    pub const GRACE_PERIOD: i64 = 30 * 24 * 60 * 60; // 2_592_000

    /// Minimum check-in interval: 30 days
    pub const MIN_CHECK_IN_INTERVAL: i64 = 30 * 24 * 60 * 60;

    /// Maximum check-in interval: 365 days
    pub const MAX_CHECK_IN_INTERVAL: i64 = 365 * 24 * 60 * 60;

    pub const SPACE: usize = 8                                       // discriminator
        + 32                                                          // owner: Pubkey
        + 4 + Self::MAX_VAULT_NAME                                   // vault_name: String
        + 1 + 1                                                       // vault_status: enum
        + 8                                                           // check_in_interval: i64
        + 8                                                           // last_check_in: i64
        + 8                                                           // triggered_at: i64
        + 1 + 32                                                      // beneficiary: Option<Pubkey>
        + 4 + (4 + Self::MAX_CID_LEN) * Self::MAX_CIDS              // ipfs_cids: Vec<String>
        + 2                                                           // file_count: u16
        + 8                                                           // created_at: i64
        + 1;                                                          // bump: u8
}
