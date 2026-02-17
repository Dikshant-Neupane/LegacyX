use anchor_lang::prelude::*;
use crate::state::VaultAccount;
use crate::errors::LegacyXError;
use crate::events::CertificateMinted;

/// # Mint Vault Certificate
///
/// Mints a Token Extension NFT as permanent proof of vault existence.
/// The NFT is non-transferable and contains metadata about the vault.
///
/// ## Trust Assumptions
/// - Only the vault owner can mint their certificate.
/// - Certificate can only be minted once per vault.
/// - The mint uses Token Extensions (Token-2022) for metadata.
///
/// ## Failure Modes
/// - Not the owner: `UnauthorizedCertificateMint`
/// - Already minted: `CertificateAlreadyMinted`
///
/// ## Note on Implementation
/// For MVP, we create a simplified certificate by storing the mint
/// address on the vault PDA. Full Token-2022 integration requires
/// additional CPI calls to the Token Extensions program.
pub fn handle_mint_certificate(ctx: Context<MintCertificate>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Must not already have a certificate
    require!(
        vault.certificate_mint.is_none(),
        LegacyXError::CertificateAlreadyMinted
    );

    let clock = Clock::get()?;

    // For MVP: store the certificate mint key on the vault
    // In production: CPI to Token-2022 program to create mint with metadata
    vault.certificate_mint = Some(ctx.accounts.certificate_mint.key());

    emit!(CertificateMinted {
        vault: vault.key(),
        owner: ctx.accounts.owner.key(),
        mint: ctx.accounts.certificate_mint.key(),
        minted_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct MintCertificate<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ LegacyXError::UnauthorizedCertificateMint,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// The mint account for the certificate NFT.
    /// CHECK: Will be initialized via CPI to Token-2022 in production.
    /// For MVP, we just store the key.
    #[account(
        init,
        payer = owner,
        space = 82, // Minimum mint account size
        seeds = [b"certificate", vault.key().as_ref()],
        bump
    )]
    pub certificate_mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
