use anchor_lang::prelude::*;

// ============================================================================
// LEGACYX CUSTOM ERROR CODES
// Every instruction failure case has a specific error code.
// Range: 6000+ (Anchor custom error range)
// ============================================================================

#[error_code]
pub enum LegacyXError {
    // === Vault Creation Errors (6000-6009) ===
    #[msg("Vault name exceeds maximum length of 64 characters.")]
    VaultNameTooLong,

    #[msg("Check-in interval must be between 30 days and 5 years.")]
    InvalidCheckInInterval,

    #[msg("At least one heir must be specified.")]
    NoHeirsProvided,

    #[msg("Maximum of 10 heirs allowed per vault.")]
    TooManyHeirs,

    #[msg("Heir pubkey cannot be the same as the vault owner.")]
    HeirIsOwner,

    // === Check-In Errors (6010-6019) ===
    #[msg("Only the vault owner can perform a check-in.")]
    UnauthorizedCheckIn,

    #[msg("Vault is not in Active state — check-in not allowed.")]
    VaultNotActive,

    #[msg("Check-in is only allowed during Active or Triggered (grace period) state.")]
    CheckInNotAllowed,

    // === Trigger Errors (6020-6029) ===
    #[msg("Check-in interval has not been exceeded yet — vault cannot be triggered.")]
    IntervalNotExceeded,

    #[msg("Vault is already in Triggered, Released, or Burned state.")]
    VaultAlreadyTriggered,

    // === Release Errors (6030-6039) ===
    #[msg("Vault must be in Triggered state before release.")]
    VaultNotTriggered,

    #[msg("30-day grace period has not expired yet.")]
    GracePeriodNotExpired,

    #[msg("Caller is not a registered heir of this vault.")]
    NotAnHeir,

    // === Conditional Release Errors (6040-6049) ===
    #[msg("Condition has already been satisfied.")]
    ConditionAlreadySatisfied,

    #[msg("Heir does not hold the required NFT for this condition.")]
    NftConditionNotMet,

    #[msg("Heir does not hold sufficient tokens for this condition.")]
    TokenConditionNotMet,

    #[msg("Timestamp condition has not been reached yet.")]
    TimestampNotReached,

    #[msg("Invalid condition type for verification.")]
    InvalidConditionType,

    // === Burn Errors (6050-6059) ===
    #[msg("Only a registered heir can burn a message.")]
    UnauthorizedBurn,

    #[msg("Vault must be in Released state before burning.")]
    VaultNotReleased,

    #[msg("The specified CID was not found in the vault.")]
    CidNotFound,

    // === Social Recovery Errors (6060-6069) ===
    #[msg("Caller is not a registered guardian of this vault.")]
    NotAGuardian,

    #[msg("Guardian has already signed for this recovery attempt.")]
    GuardianAlreadySigned,

    #[msg("Recovery threshold not yet reached — more guardian signatures needed.")]
    ThresholdNotReached,

    #[msg("Maximum of 7 guardians allowed per vault.")]
    TooManyGuardians,

    #[msg("Recovery threshold must be between 1 and the number of guardians.")]
    InvalidRecoveryThreshold,

    #[msg("New owner cannot be the current owner.")]
    NewOwnerIsCurrent,

    // === Identity Proof Errors (6070-6079) ===
    #[msg("Only the vault owner can submit identity proof.")]
    UnauthorizedIdentityProof,

    #[msg("Face hash must be exactly 32 bytes (SHA-256).")]
    InvalidFaceHash,

    #[msg("Voice hash must be exactly 32 bytes (SHA-256).")]
    InvalidVoiceHash,

    // === Whistleblower Errors (6080-6089) ===
    #[msg("Whistleblower broadcast has already been executed for this vault.")]
    AlreadyBroadcast,

    #[msg("Vault must be in Triggered state for whistleblower broadcast.")]
    VaultNotTriggeredForBroadcast,

    #[msg("No broadcast wallets configured for this vault.")]
    NoBroadcastWallets,

    #[msg("Maximum of 50 broadcast wallets per account (use overflow accounts for more).")]
    TooManyBroadcastWallets,

    // === Certificate Errors (6090-6099) ===
    #[msg("Vault certificate has already been minted.")]
    CertificateAlreadyMinted,

    #[msg("Only the vault owner can mint a certificate.")]
    UnauthorizedCertificateMint,

    // === General Errors (6100+) ===
    #[msg("Arithmetic overflow detected.")]
    ArithmeticOverflow,

    #[msg("Arweave CID exceeds maximum length of 64 characters.")]
    CidTooLong,

    #[msg("Maximum of 100 files allowed per vault.")]
    TooManyCids,

    #[msg("Encrypted key shard exceeds maximum length.")]
    ShardTooLong,

    #[msg("Phantom Wallet signature verification failed.")]
    InvalidSignature,
}
