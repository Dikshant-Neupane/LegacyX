# LegacyX

**Not even we can touch it.**

A Solana-powered digital life vault where every human stores their assets, secrets, final words, conditional inheritance, whistleblower evidence, and real identity proof — governed by unstoppable smart contracts on-chain.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Live Demo](#live-demo)
- [Solana Devnet Program](#solana-devnet-program)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Smart Contract Instructions](#smart-contract-instructions)
- [API Endpoints](#api-endpoints)
- [Security Model](#security-model)
- [Explorer Integration](#explorer-integration)
- [Business Model](#business-model)
- [Demo Video](#demo-video)
- [Team](#team)
- [License](#license)

---

## Problem Statement

- **70% of digital assets are lost forever** when someone dies — no inheritance plan, no recovery.
- **Your deepfake exists right now.** You cannot prove it isn't you. There is no cryptographic proof of your real identity anchored in time.
- **Your final words exist only inside your head.** If you die today, the people you love will never hear what you needed to say.
- **Lawyers charge $50,000+** for estate planning. Conditional inheritance is gated behind wealth.
- **Whistleblowers die with their evidence** if they cannot guarantee its release.

---

## Solution

LegacyX is a **zero-trust digital vault** built on Solana where:

1. **You encrypt everything on your device** — our servers never see your data, not even once.
2. **Your vault lives permanently on Arweave** — even if we shut down tomorrow, your vault exists forever.
3. **Smart contracts enforce your rules** — check-in deadlines, conditional inheritance, dead-man switches.
4. **Phantom Wallet is your only identity** — no email, no password, no OAuth. Just your wallet.
5. **Anyone can verify your vault on Solscan** in one click.

---

## Core Features

### Regret Vault
Encrypted final words — voice, video, or text — released to specific people after death. **Burn-after-read** option permanently destroys after first view.

### Conditional Inheritance
Digital assets locked behind on-chain verifiable conditions set by the owner. No lawyers. **$10 instead of $50,000.**

### Whistleblower Switch
Evidence auto-broadcasts to 1,000 wallets if owner stops checking in. **Permanently unstoppable** once configured.

### Soul Wallet
Your memory and voice preserved. Your bloodline holds the key.

### Proof of You
Biometric hash anchored on Solana while alive. **Cryptographic proof you are real and not a deepfake.** Verifiable by anyone on Solscan.

### Social Recovery
3-of-N Phantom Wallet guardian multisig for vault recovery if owner loses wallet access.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Solana (Devnet for MVP, Mainnet for production) |
| **Smart Contracts** | Rust + Anchor Framework |
| **Storage** | Arweave (permanent encrypted file storage) |
| **Frontend** | Next.js 14 + TypeScript + TailwindCSS + Framer Motion |
| **Wallet** | Phantom Wallet — ONLY authentication method |
| **Wallet Adapter** | @solana/wallet-adapter-react |
| **3D Visuals** | Three.js (vault orb sphere) |
| **Animations** | Framer Motion + GSAP + CSS custom keyframes |
| **Smooth Scroll** | Lenis |
| **Mobile** | Solana Mobile Stack (SMS) + React Native |
| **Deployment** | Vercel (frontend + serverless backend) |
| **Explorers** | Solscan, Solana Explorer, Orb by Helius |

---

## Live Demo

🔗 **Vercel**: [https://legacyx.vercel.app](https://legacyx.vercel.app)

<!-- Update with actual deployed URL before submission -->

---

## Solana Devnet Program

| Item | Link |
|------|------|
| **Program ID** | `LGCYxV1111111111111111111111111111111111111` |
| **Solscan** | [View on Solscan](https://solscan.io/account/LGCYxV1111111111111111111111111111111111111?cluster=devnet) |
| **Solana Explorer** | [View on Explorer](https://explorer.solana.com/address/LGCYxV1111111111111111111111111111111111111?cluster=devnet) |
| **Sample Vault TX** | <!-- Add after deployment --> |

<!-- Update Program ID after deployment to Devnet -->

### Anchor Test Results

<!-- Add screenshot of green tests here -->

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system architecture with Mermaid diagrams.

**Three-Layer Vault:**
1. **Arweave** — Encrypted file storage (permanent)
2. **Solana** — Rules, keys, and hashes (immutable)
3. **Device Biometric** — Access control (local only)

**Zero-Trust Principle:** The server is intentionally blind. All encryption happens in the browser via SubtleCrypto before any network call. The server NEVER receives or stores unencrypted user data.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Solana CLI 1.17+
- Anchor CLI 0.29+
- Phantom Wallet browser extension

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/legacyx.git
cd legacyx

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Build Solana programs
cd ..
anchor build

# Run Anchor tests
anchor test

# Start frontend dev server
cd frontend
npm run dev

# Start backend dev server (separate terminal)
cd backend
npm run dev
```

### Environment Variables

Copy `.env.example` files and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

See [backend/.env.example](backend/.env.example) for all required variables.

---

## Project Structure

```
legacyx/
├── programs/legacyx/          # Solana smart contracts (Anchor/Rust)
│   └── src/
│       ├── lib.rs             # Program entry point
│       ├── instructions/      # One file per instruction
│       ├── state/             # Account data structures
│       ├── errors.rs          # Custom error codes
│       └── events.rs          # On-chain event definitions
├── tests/                     # Anchor TypeScript test suite
├── frontend/                  # Next.js 14 frontend
│   ├── app/                   # App Router pages
│   ├── components/            # Custom component library
│   ├── lib/                   # Encryption, wallet, explorer utilities
│   ├── hooks/                 # Custom React hooks
│   └── styles/                # Global styles, design tokens
├── backend/                   # Fastify API (Vercel serverless)
│   └── src/
│       ├── routes/            # API route handlers
│       ├── services/          # Arweave, Solana, notification services
│       ├── jobs/              # Check-in monitoring cron
│       └── middleware/        # Auth, validation, rate limiting
├── mobile/                    # Solana Mobile Stack (React Native)
├── docs/                      # Architecture, security, threat model
├── Anchor.toml                # Anchor configuration
└── README.md                  # This file
```

---

## Smart Contract Instructions

| Instruction | Description | Access |
|------------|-------------|--------|
| `create_vault` | Initialize vault PDA, set interval, assign heirs | Owner only |
| `check_in` | Sign proof-of-life, reset timer | Owner only |
| `trigger_release` | Start 30-day grace period after missed check-in | Anyone |
| `release_to_heir` | Distribute key shards to heirs after grace period | Registered heir |
| `conditional_release` | Prove condition to unlock specific assets | Registered heir |
| `burn_message` | Permanently delete message CID from chain | Registered heir |
| `social_recovery` | M-of-N guardian multisig to reassign owner | Registered guardian |
| `identity_proof` | Anchor biometric SHA-256 hash on-chain | Owner only |
| `configure_whistleblower` | Set 1000 broadcast wallet addresses | Owner only |
| `whistleblower_broadcast` | Execute irreversible broadcast | Anyone (if triggered) |
| `mint_certificate` | Mint Token Extension NFT proof of vault | Owner only |
| `add_heir` | Add new heir to vault | Owner only |
| `add_file` | Store encrypted Arweave CID on vault PDA | Owner only |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vault/create` | Initialize vault PDA, mint certificate NFT |
| POST | `/api/vault/checkin` | Submit Phantom signed check-in transaction |
| POST | `/api/vault/upload` | Receive encrypted blob, upload to Arweave |
| GET | `/api/vault/:pubkey` | Return vault status, file list, heir info |
| GET | `/api/vault/:pubkey/certificate` | Return NFT certificate with verification links |
| POST | `/api/identity/proof` | Submit biometric hash to Solana |
| POST | `/api/recovery/initiate` | Start social recovery flow |
| POST | `/api/recovery/sign` | Guardian submits Phantom signature |
| POST | `/api/whistleblower/configure` | Set broadcast wallet addresses |
| GET | `/api/explorer/:txid` | Return formatted Solscan/Explorer/Orb links |

Full API documentation: [backend/API.md](backend/API.md)

---

## Security Model

### Zero-Trust Architecture

| Principle | Implementation |
|-----------|---------------|
| **Client-side encryption** | AES-256-GCM via SubtleCrypto — runs in browser before any network call |
| **Key derivation** | HKDF from Phantom Wallet keypair — key never leaves device |
| **Secret sharing** | Shamir's Secret Sharing — M-of-N shards for heir reconstruction |
| **Biometric privacy** | SHA-256 hash only — raw data destroyed from memory after hashing |
| **Server blindness** | Server receives ONLY encrypted blobs and hashes — zero plaintext |
| **On-chain verification** | All vault state verifiable on Solscan by anyone |

See [docs/threat-model.md](docs/threat-model.md) for the complete threat model.

---

## Explorer Integration

Every on-chain action in LegacyX immediately provides three verification links:

- **[Solscan](https://solscan.io)** — Primary transaction explorer (shown after every action)
- **[Solana Explorer](https://explorer.solana.com)** — Official verification (vault certificates)
- **[Orb by Helius](https://orb.helius.dev)** — Visual explorer (demo video presentation)

---

## Business Model

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | Basic vault, 1 heir, 100MB storage, annual check-in |
| **Premium** | $9.99/mo | Unlimited heirs, 10GB, Soul Wallet, conditional inheritance |
| **Enterprise** | $99/mo | Whistleblower vault, corporate identity, custom intervals |
| **One-Time** | $4.99 | Single Regret Vault message with burn-after-read |

---

## Demo Video

🎥 **Watch**: <!-- Add Loom or YouTube link -->

**Video Structure (3 minutes max):**
- 0:00–0:30 — Problem statement
- 0:30–2:30 — Live demo on Solana Devnet
- 2:30–3:00 — Broader implications for Nepal and global market

---

## Team

| Name | Role | Location |
|------|------|----------|
| Dikshant Neupane | Full Stack Developer & Founder | Nepal 🇳🇵 |

**Built in Nepal. Powered by Solana.**

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>LegacyX — Your life, encrypted. Your legacy, permanent.</strong><br/>
  <em>Not even we can touch it.</em>
</p>
