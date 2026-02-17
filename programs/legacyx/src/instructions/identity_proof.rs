use anchor_lang::prelude::*;
use crate::state::IdentityProof;
use crate::errors::LegacyXError;
use crate::events::IdentityProofAnchored;

/// # Identity Proof
///
/// Stores SHA-256 hash of biometric data on-chain with a Solana timestamp.
/// This creates a cryptographic anchor proving that a specific biometric
/// signature existed at a specific point in time — an anti-deepfake proof.
///
/// ## Trust Assumptions
/// - Raw biometric data (face image, voice recording) was processed entirely
///   on the client device using SubtleCrypto SHA-256.
/// - Raw biometric data was DESTROYED from device memory after hashing.
/// - Only the 32-byte SHA-256 hash reaches the chain.
/// - The Solana Clock provides a trusted timestamp.
/// - Only the vault owner can submit their identity proof.
///
/// ## Failure Modes
/// - Not the owner: `UnauthorizedIdentityProof`
/// - If PDA already exists and owner wants to update: re-init allowed
pub fn handle_identity_proof(
    ctx: Context<IdentityProofAccounts>,
    face_hash: [u8; 32],
    voice_hash: [u8; 32],
) -> Result<()> {
    let identity = &mut ctx.accounts.identity_proof;

    let clock = Clock::get()?;

    identity.owner = ctx.accounts.owner.key();
    identity.face_hash = face_hash;
    identity.voice_hash = voice_hash;
    identity.proved_at = clock.unix_timestamp;
    identity.is_active = true;
    identity.bump = ctx.bumps.identity_proof;

    emit!(IdentityProofAnchored {
        owner: ctx.accounts.owner.key(),
        face_hash,
        voice_hash,
        proved_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct IdentityProofAccounts<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = IdentityProof::SPACE,
        seeds = [b"identity", owner.key().as_ref()],
        bump
    )]
    pub identity_proof: Account<'info, IdentityProof>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
