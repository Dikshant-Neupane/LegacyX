use anchor_lang::prelude::*;

// ============================================================================
// SOULVAULT CUSTOM ERROR CODES
// Range: 6000+ (Anchor custom error range)
// ============================================================================

#[error_code]
pub enum SoulVaultError {
    // === Vault Creation (6000-6009) ===
    #[msg("Vault name exceeds maximum length of 32 characters.")]
    VaultNameTooLong,

    #[msg("Vault name cannot be empty.")]
    VaultNameEmpty,

    #[msg("Check-in interval must be between 30 and 365 days.")]
    InvalidCheckInInterval,

    #[msg("Beneficiary cannot be the vault owner.")]
    BeneficiaryIsOwner,

    // === Authorization (6010-6019) ===
    #[msg("Only the vault owner can perform this action.")]
    Unauthorized,

    #[msg("Vault must be Active or Triggered to check in.")]
    CheckInNotAllowed,

    // === Trigger (6020-6029) ===
    #[msg("Check-in interval has not been exceeded yet.")]
    IntervalNotExceeded,

    #[msg("Vault must be Active to trigger release.")]
    VaultNotActive,

    // === Release (6030-6039) ===
    #[msg("Vault must be in Triggered state to release.")]
    VaultNotTriggered,

    #[msg("30-day grace period has not expired yet.")]
    GracePeriodNotExpired,

    #[msg("Caller is not the beneficiary of this vault.")]
    NotBeneficiary,

    #[msg("No beneficiary is set for this vault.")]
    NoBeneficiarySet,

    // === File Management (6040-6049) ===
    #[msg("IPFS CID exceeds maximum length of 64 characters.")]
    CidTooLong,

    #[msg("IPFS CID cannot be empty.")]
    CidEmpty,

    #[msg("Maximum of 50 files allowed per vault.")]
    TooManyCids,

    #[msg("Vault must be Active to add files.")]
    VaultNotActiveForFile,

    // === General (6100+) ===
    #[msg("Arithmetic overflow detected.")]
    ArithmeticOverflow,

    #[msg("Vault is already released.")]
    VaultAlreadyReleased,
}
