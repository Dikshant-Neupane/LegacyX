# LegacyX — Requirements Document & Local Environment Setup

This document lists every dependency, tool, and configuration required to run LegacyX locally on localhost.

---

## Supported Operating Systems

| OS | Notes |
|----|-------|
| macOS 13 Ventura or above | Recommended |
| Ubuntu 22.04 LTS or above | Recommended |
| Windows 11 with WSL2 Ubuntu | Supported — run all commands inside WSL2 |

---

## Core Tools

| Tool | Version Required | Check Command | Install |
|------|-----------------|---------------|---------|
| **Node.js** | 18.0.0+ (LTS) | `node --version` | [nodejs.org](https://nodejs.org) or `brew install node` |
| **npm** | 9.0.0+ | `npm --version` | Comes with Node.js |
| **Rust** | 1.75.0+ (stable) | `rustc --version` | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Solana CLI** | 1.18.0+ | `solana --version` | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| **Anchor CLI** | 0.30.0+ | `anchor --version` | `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest` |
| **Git** | 2.38.0+ | `git --version` | `brew install git` / `sudo apt-get install git` |

---

## Solana Setup

### 1. Generate Local Keypair

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

This is your **developer wallet** — not for real funds.

### 2. Set Network to Devnet

```bash
solana config set --url https://api.devnet.solana.com
```

Verify: `solana config get` should show `RPC URL: https://api.devnet.solana.com`

### 3. Airdrop Devnet SOL

```bash
solana airdrop 2
```

You need **at least 2 SOL** to deploy programs and run tests. Run airdrop multiple times if needed — Devnet SOL is free.

Verify: `solana balance` should show `2 SOL` or more.

---

## Frontend Dependencies

**Framework:** Next.js 14 &nbsp;|&nbsp; **Package Manager:** npm

### Install

```bash
cd frontend && npm install
```

### Required Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.0.0+ | React framework |
| `react` | 18.0.0+ | UI library |
| `typescript` | 5.0.0+ | Type safety |
| `tailwindcss` | 3.4.0+ | Utility CSS |
| `@solana/wallet-adapter-react` | 0.15.35+ | Wallet connections |
| `@solana/wallet-adapter-phantom` | 0.9.24+ | Phantom adapter |
| `@solana/web3.js` | 1.87.0+ | Solana blockchain interactions |
| `@coral-xyz/anchor` | 0.30.0+ | Anchor program client |
| `framer-motion` | 10.0.0+ | Animations & transitions |
| `three` | 0.160.0+ | 3D vault orb |
| `@types/three` | 0.160.0+ | Three.js TypeScript types |
| `lenis` | 1.0.0+ | Smooth scrolling |
| `gsap` | 3.12.0+ | Advanced animation sequences |
| `arweave` | 1.14.0+ | Permanent file storage |
| `zod` | 3.22.0+ | Form input validation |

### Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana Devnet RPC |
| `NEXT_PUBLIC_PROGRAM_ID` | `YOUR_DEPLOYED_PROGRAM_ID` | LegacyX Anchor program ID |
| `NEXT_PUBLIC_NETWORK` | `devnet` | Solana network |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3001` | Backend API URL |

### Run Locally

```bash
cd frontend && npm run dev
# → http://localhost:3000
```

---

## Backend Dependencies

**Framework:** Fastify + Zod &nbsp;|&nbsp; **Package Manager:** npm

### Install

```bash
cd backend && npm install
```

### Required Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `fastify` | 4.24.0+ | HTTP server |
| `typescript` | 5.0.0+ | Type safety |
| `ts-node` | 10.9.0+ | TypeScript execution |
| `@solana/web3.js` | 1.87.0+ | Solana interactions |
| `@coral-xyz/anchor` | 0.30.0+ | Anchor program client |
| `arweave` | 1.14.0+ | Encrypted file uploads |
| `zod` | 3.22.0+ | Input validation |
| `@fastify/rate-limit` | 9.0.0+ | Rate limiting |
| `nodemailer` | 6.9.0+ | Notification emails |
| `node-cron` | 3.0.0+ | Check-in cron jobs |
| `tweetnacl` | 1.0.3+ | Signature verification |
| `bs58` | 5.0.0+ | Base58 encoding |
| `dotenv` | 16.3.0+ | Environment loading |

### Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana Devnet RPC |
| `PROGRAM_ID` | `YOUR_DEPLOYED_PROGRAM_ID` | LegacyX program ID |
| `ARWEAVE_KEY` | `./arweave-wallet.json` | Arweave wallet key |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server for emails |
| `SMTP_USER` | `your@email.com` | SMTP username |
| `SMTP_PASS` | `YOUR_APP_PASSWORD` | SMTP password |
| `JWT_SECRET` | `a-long-random-secret-string` | Session token secret |

### Run Locally

```bash
cd backend && npm run dev
# → http://localhost:3001
```

---

## Anchor Program (Smart Contracts)

### Rust Dependencies (Cargo.toml)

| Crate | Version | Purpose |
|-------|---------|---------|
| `anchor-lang` | 0.30.0 | Anchor Framework |
| `anchor-spl` | 0.30.0 | SPL token helpers |
| `spl-token` | 4.0.0 | Token Extensions for certificate NFT |

### Build & Deploy

```bash
anchor build
anchor deploy --provider.cluster devnet
```

You need **at least 2 SOL** on your Devnet wallet to deploy.

### Run Tests

```bash
anchor test
```

---

## Browser Requirements

| Requirement | Details |
|-------------|---------|
| **Browser** | Chrome 120+, Firefox 121+, or Brave 1.60+ |
| **Phantom Wallet** | Install from [phantom.app](https://phantom.app/download) |

### Phantom Setup

1. Install the Phantom extension
2. Create or import a wallet
3. Switch to **Devnet**: Settings → Developer Settings → Change Network to Devnet
4. Airdrop Devnet SOL from within Phantom

---

## Optional Tools

| Tool | Purpose | Install |
|------|---------|---------|
| Vercel CLI | Deploy frontend | `npm install -g vercel` |
| Android Studio | Mobile APK (Phase 5) | [developer.android.com/studio](https://developer.android.com/studio) |
| Arweave CLI | Test uploads | `npm install -g arweave-cli` |

---

## Quick Start — Exact Order

```
 1. Install Rust        → curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
 2. Install Solana CLI  → sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
 3. Install Anchor CLI  → cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest
 4. Install Node.js 18  → download from nodejs.org or use nvm
 5. Clone the repo      → git clone <repo-url> && cd legacyx
 6. Generate keypair    → solana-keygen new --outfile ~/.config/solana/id.json
 7. Set Devnet          → solana config set --url https://api.devnet.solana.com
 8. Airdrop SOL         → solana airdrop 2
 9. Frontend deps       → cd frontend && npm install
10. Frontend env        → cp .env.example .env.local  (fill in values)
11. Backend deps        → cd ../backend && npm install
12. Backend env         → cp .env.example .env  (fill in values)
13. Build & deploy      → anchor build && anchor deploy --provider.cluster devnet
14. Copy Program ID     → paste into both .env.local and .env
15. Start backend       → cd backend && npm run dev  (port 3001)
16. Start frontend      → cd frontend && npm run dev  (port 3000)
17. Open browser        → http://localhost:3000 with Phantom on Devnet
18. Run env checker     → chmod +x check_environment.sh && ./check_environment.sh
19. Run tests           → anchor test
20. Done                → LegacyX is running locally
```

---

## Environment Checker

Run the automated checker to verify everything is ready:

```bash
chmod +x check_environment.sh && ./check_environment.sh
```

Or run these commands manually and verify each:

| Step | Command | Expected |
|------|---------|----------|
| 1 | `node --version` | v18.0.0+ |
| 2 | `npm --version` | 9.0.0+ |
| 3 | `rustc --version` | 1.75.0+ |
| 4 | `solana --version` | 1.18.0+ |
| 5 | `solana config get` | RPC URL: https://api.devnet.solana.com |
| 6 | `solana address` | Valid base58 address |
| 7 | `solana balance` | 2+ SOL |
| 8 | `anchor --version` | 0.30.0+ |
| 9 | `git --version` | 2.38.0+ |
| 10 | `ls frontend/.env.local` | File exists |
| 11 | `ls backend/.env` | File exists |
| 12 | `anchor build` | Finished release target |
| 13 | `cd frontend && npm run build` | No errors |
| 14 | Browser check | Phantom extension visible, set to Devnet |
