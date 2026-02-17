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
    /// Grace period expired — assets released to heirs
    Released,
    /// Heir has read and burned the message — CID removed
    Burned,
}

impl Default for VaultStatus {
    fn default() -> Self {
        VaultStatus::Active
    }
}

// ============================================================================
// CONDITION TYPE ENUM
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ConditionType {
    /// Heir must hold a specific NFT (e.g., university diploma NFT)
    HoldsNft,
    /// Heir must hold a specific token above a threshold
    HoldsToken,
    /// A specific on-chain timestamp must have passed
    TimestampReached,
    /// Custom on-chain proof verified by a designated oracle
    CustomProof,
}

// ============================================================================
// VAULT ACCOUNT — Primary PDA
// Seeds: ["vault", owner_pubkey]
// ============================================================================

/// The main vault account. One per user. Stores all vault configuration,
/// heir assignments, check-in state, and references to encrypted Arweave data.
///
/// SECURITY: This account NEVER contains raw files, encryption keys, or
/// biometric data. Only CIDs (content identifiers) and hashes.
#[account]
#[derive(Default)]
pub struct VaultAccount {
    /// The Phantom Wallet public key of the vault owner.
    /// This is the SOLE authority — no email, no OAuth.
    pub owner: Pubkey,

    /// Array of heir Phantom Wallet public keys who will receive vault contents.
    /// Maximum 10 heirs per vault.
    pub heir_pubkeys: Vec<Pubkey>,

    /// Check-in interval in seconds. Owner must sign a check_in transaction
    /// within this interval or the vault enters Triggered state.
    /// Range: 30 days (2_592_000) to 5 years (157_680_000)
    pub check_in_interval: i64,

    /// Unix timestamp of the last successful check-in.
    /// Set to current clock timestamp on create_vault and each check_in.
    pub last_check_in: i64,

    /// Timestamp when the vault was triggered (check-in missed).
    /// Zero if vault has not been triggered.
    pub triggered_at: i64,

    /// Current vault lifecycle state.
    pub vault_status: VaultStatus,

    /// Arweave Content IDs (CIDs) of encrypted files stored permanently.
    /// Each CID is a 43-character base64url string (Arweave transaction ID).
    /// Maximum 100 CIDs per vault.
    pub arweave_cids: Vec<String>,

    /// Encrypted key shards — one per heir. Each shard is an encrypted
    /// Shamir's Secret Sharing fragment that, combined with M-of-N other
    /// shards, reconstructs the vault encryption key.
    /// Maximum 10 shards (one per heir).
    pub encrypted_key_shards: Vec<String>,

    /// Guardian Phantom Wallet public keys for social recovery.
    /// M-of-N guardians can sign to reassign the vault owner.
    /// Maximum 7 guardians.
    pub guardian_pubkeys: Vec<Pubkey>,

    /// Number of guardian signatures required for social recovery.
    /// Must satisfy: 1 <= recovery_threshold <= guardian_pubkeys.len()
    pub recovery_threshold: u8,

    /// Whether this vault has whistleblower broadcast configured.
    pub whistleblower_enabled: bool,

    /// Vault name given by owner (display only, not sensitive).
    /// Maximum 64 bytes UTF-8.
    pub vault_name: String,

    /// Token Extension mint address for the vault certificate NFT.
    /// Set after mint_vault_certificate instruction.
    pub certificate_mint: Option<Pubkey>,

    /// Unix timestamp when the vault was created.
    pub created_at: i64,

    /// Bump seed for this PDA — stored for efficient re-derivation.
    pub bump: u8,
}

impl VaultAccount {
    /// Calculate the space needed for this account.
    /// Anchor discriminator (8) + all fields.
    pub const MAX_HEIRS: usize = 10;
    pub const MAX_CIDS: usize = 100;
    pub const MAX_SHARDS: usize = 10;
    pub const MAX_GUARDIANS: usize = 7;
    pub const MAX_VAULT_NAME: usize = 64;
    pub const MAX_CID_LEN: usize = 64;
    pub const MAX_SHARD_LEN: usize = 256;

    pub const SPACE: usize = 8                                      // discriminator
        + 32                                                         // owner: Pubkey
        + 4 + (32 * Self::MAX_HEIRS)                                // heir_pubkeys: Vec<Pubkey>
        + 8                                                          // check_in_interval: i64
        + 8                                                          // last_check_in: i64
        + 8                                                          // triggered_at: i64
        + 1 + 1                                                      // vault_status: enum (1 discriminator + 1 padding)
        + 4 + (4 + Self::MAX_CID_LEN) * Self::MAX_CIDS             // arweave_cids: Vec<String>
        + 4 + (4 + Self::MAX_SHARD_LEN) * Self::MAX_SHARDS         // encrypted_key_shards: Vec<String>
        + 4 + (32 * Self::MAX_GUARDIANS)                            // guardian_pubkeys: Vec<Pubkey>
        + 1                                                          // recovery_threshold: u8
        + 1                                                          // whistleblower_enabled: bool
        + 4 + Self::MAX_VAULT_NAME                                  // vault_name: String
        + 1 + 32                                                     // certificate_mint: Option<Pubkey>
        + 8                                                          // created_at: i64
        + 1;                                                         // bump: u8
}

// ============================================================================
// VAULT CONDITION — Per-condition PDA
// Seeds: ["condition", vault_pubkey, condition_index (u8 as bytes)]
// ============================================================================

/// A single condition that must be satisfied before specific assets unlock
/// for a particular heir. Supports NFT possession, token thresholds,
/// timestamp gates, and custom on-chain proofs.
///
/// SECURITY: Conditions are verified purely on-chain. No server involvement.
#[account]
pub struct VaultCondition {
    /// The vault this condition belongs to.
    pub vault: Pubkey,

    /// The heir who must satisfy this condition.
    pub heir: Pubkey,

    /// Type of condition to verify.
    pub condition_type: ConditionType,

    /// For HoldsNft: the mint address of the required NFT.
    /// For HoldsToken: the mint address of the required token.
    /// For CustomProof: the oracle/verifier program address.
    /// For TimestampReached: unused (set to system program).
    pub proof_mint_or_program: Pubkey,

    /// For HoldsToken: minimum token amount required.
    /// For TimestampReached: the target Unix timestamp.
    /// For others: unused (set to 0).
    pub threshold_or_timestamp: u64,

    /// Arweave CIDs that unlock when this condition is satisfied.
    /// References CIDs stored in the parent VaultAccount.
    pub locked_cids: Vec<String>,

    /// Whether this condition has been satisfied.
    pub is_satisfied: bool,

    /// Timestamp when condition was satisfied (0 if not yet).
    pub satisfied_at: i64,

    /// Human-readable label for display (e.g., "Graduate University").
    /// Maximum 128 bytes UTF-8.
    pub label: String,

    /// Index of this condition within the vault (for PDA derivation).
    pub condition_index: u8,

    /// PDA bump seed.
    pub bump: u8,
}

impl VaultCondition {
    pub const MAX_LOCKED_CIDS: usize = 20;
    pub const MAX_CID_LEN: usize = 64;
    pub const MAX_LABEL_LEN: usize = 128;

    pub const SPACE: usize = 8                                       // discriminator
        + 32                                                          // vault: Pubkey
        + 32                                                          // heir: Pubkey
        + 1 + 1                                                       // condition_type: enum
        + 32                                                          // proof_mint_or_program: Pubkey
        + 8                                                           // threshold_or_timestamp: u64
        + 4 + (4 + Self::MAX_CID_LEN) * Self::MAX_LOCKED_CIDS       // locked_cids: Vec<String>
        + 1                                                           // is_satisfied: bool
        + 8                                                           // satisfied_at: i64
        + 4 + Self::MAX_LABEL_LEN                                    // label: String
        + 1                                                           // condition_index: u8
        + 1;                                                          // bump: u8
}

// ============================================================================
// IDENTITY PROOF — Per-user PDA
// Seeds: ["identity", owner_pubkey]
// ============================================================================

/// On-chain anchor for anti-deepfake identity proof.
/// Stores SHA-256 hashes of biometric data — never raw biometrics.
///
/// SECURITY: Raw face images and voice recordings are captured in the browser,
/// hashed via SubtleCrypto SHA-256, then DESTROYED from memory.
/// Only the hash reaches the chain.
#[account]
pub struct IdentityProof {
    /// Vault owner who proved their identity.
    pub owner: Pubkey,

    /// SHA-256 hash of face landmark array.
    /// 32 bytes (256 bits).
    pub face_hash: [u8; 32],

    /// SHA-256 hash of voice spectrogram data.
    /// 32 bytes (256 bits).
    pub voice_hash: [u8; 32],

    /// Solana Clock timestamp when the proof was anchored.
    /// This timestamp proves the biometric existed at this point in time,
    /// making it a cryptographic anchor against future deepfakes.
    pub proved_at: i64,

    /// Whether this proof is still considered valid.
    /// Owner can update proof by re-anchoring.
    pub is_active: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl IdentityProof {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // owner: Pubkey
        + 32                      // face_hash: [u8; 32]
        + 32                      // voice_hash: [u8; 32]
        + 8                       // proved_at: i64
        + 1                       // is_active: bool
        + 1;                      // bump: u8
}

// ============================================================================
// GUARDIAN RECORD — Per-guardian-per-vault PDA
// Seeds: ["guardian", vault_pubkey, guardian_pubkey]
// ============================================================================

/// Tracks whether a guardian has signed for a social recovery attempt.
/// M-of-N guardians must sign before vault ownership transfers.
///
/// SECURITY: Each guardian must independently sign with their own Phantom Wallet.
/// The program verifies each signature on-chain.
#[account]
pub struct GuardianRecord {
    /// The vault this guardian record belongs to.
    pub vault: Pubkey,

    /// The guardian's Phantom Wallet public key.
    pub guardian: Pubkey,

    /// Whether this guardian has signed for the current recovery attempt.
    pub has_signed: bool,

    /// Timestamp of when the guardian signed (0 if not yet).
    pub signed_at: i64,

    /// The proposed new owner pubkey this guardian is vouching for.
    pub proposed_new_owner: Pubkey,

    /// PDA bump seed.
    pub bump: u8,
}

impl GuardianRecord {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // vault: Pubkey
        + 32                      // guardian: Pubkey
        + 1                       // has_signed: bool
        + 8                       // signed_at: i64
        + 32                      // proposed_new_owner: Pubkey
        + 1;                      // bump: u8
}

// ============================================================================
// WHISTLEBLOWER CONFIG — Per-vault PDA
// Seeds: ["whistleblower", vault_pubkey]
// ============================================================================

/// Configuration for the whistleblower dead-man's switch.
/// If vault enters Triggered state and has whistleblower enabled, ALL
/// encrypted CIDs are broadcast to up to 1000 pre-configured wallet addresses.
///
/// SECURITY: This action is IRREVERSIBLE once triggered. The broadcast
/// wallets receive the encrypted CIDs — they still need key shards to decrypt.
/// The broadcast itself is the signal that something happened.
#[account]
pub struct WhistleblowerConfig {
    /// The vault this config belongs to.
    pub vault: Pubkey,

    /// Array of wallet addresses to broadcast to.
    /// Maximum 1000 addresses, stored across multiple transactions if needed.
    /// For MVP: storing first batch in this account, overflow in linked accounts.
    pub broadcast_wallets: Vec<Pubkey>,

    /// Whether the broadcast has been executed.
    pub has_broadcast: bool,

    /// Timestamp of broadcast execution (0 if not yet).
    pub broadcast_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl WhistleblowerConfig {
    /// For MVP, we store up to 50 wallets per account.
    /// Additional wallets stored in overflow accounts.
    pub const MAX_WALLETS_PER_ACCOUNT: usize = 50;

    pub const SPACE: usize = 8                                       // discriminator
        + 32                                                          // vault: Pubkey
        + 4 + (32 * Self::MAX_WALLETS_PER_ACCOUNT)                  // broadcast_wallets: Vec<Pubkey>
        + 1                                                           // has_broadcast: bool
        + 8                                                           // broadcast_at: i64
        + 1;                                                          // bump: u8
}
