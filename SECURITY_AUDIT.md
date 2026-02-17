# LegacyX Security Audit Checklist

## Status: Pre-Mainnet Review
**Date**: Generated during Phase 7
**Scope**: Smart contracts, backend API, frontend, mobile, encryption pipeline

---

## 1. Smart Contract Security

### 1.1 Access Control
- [x] All owner-only instructions use `has_one = owner` constraint
- [x] PDA seeds include owner pubkey to prevent cross-vault access
- [x] `trigger_release` allows anyone (by design — dead man's switch)
- [x] `release_to_heir` validates caller is in `heir_pubkeys` vec
- [x] `burn_message` validates caller is heir + vault status is `Released`
- [x] Guardian-only actions validate `guardian_pubkeys` membership
- [x] Certificate mint restricted to vault owner via `has_one`

### 1.2 State Machine
- [x] Vault status enum: Active → Triggered → Released → Burned
- [x] No backwards transitions allowed
- [x] `trigger_release` checks `last_check_in + interval < now`
- [x] 30-day grace period between Triggered and Released
- [x] Certificate cannot be re-minted (`CertificateAlreadyMinted` error)
- [x] Whistleblower cannot re-broadcast (`AlreadyBroadcast` error)

### 1.3 Input Validation
- [x] Vault name: max 64 chars, non-empty
- [x] Check-in interval: minimum 86400 (1 day)
- [x] Heirs: 1-10, cannot include owner
- [x] Guardians: max 7
- [x] Recovery threshold: ≤ guardian count
- [x] Arweave CIDs: max 100 per vault, max length per CID
- [x] Broadcast wallets: max 50
- [x] Identity hashes: fixed 32 bytes

### 1.4 Account Safety
- [x] All PDAs derived with `bump` stored on-chain
- [x] `init` accounts cannot be re-initialized (Anchor constraint)
- [x] `init_if_needed` used for guardian_record and identity (safe — PDA-scoped)
- [x] No unchecked arithmetic (all `checked_add`/`checked_sub` or BN ops)
- [x] No realloc needed — max sizes defined at init

### 1.5 Known Risks
- [ ] **REVIEW**: `trigger_release` callable by anyone — intended but needs integration test
- [ ] **REVIEW**: No on-chain time oracle — relies on Solana's `Clock::get()`
- [ ] **REVIEW**: Large account sizes (VaultAccount ~10KB) — rent cost acceptable

---

## 2. Backend API Security

### 2.1 Authentication
- [x] All mutating endpoints require signed auth message
- [x] Auth message includes timestamp for replay protection
- [x] Signature verified via `@solana/web3.js` nacl
- [x] No session tokens stored server-side (stateless auth)
- [x] Wallet pubkey extracted from signature, not user input

### 2.2 Rate Limiting
- [x] Global rate limit via Fastify plugin
- [x] Per-IP rate limiting on auth endpoints
- [x] Upload endpoint rate limited separately
- [ ] **TODO**: Add per-wallet rate limiting

### 2.3 Input Validation
- [x] All request bodies validated via Zod schemas
- [x] PublicKey format validated before use
- [x] File upload size limits enforced
- [x] CID format validation before Arweave upload
- [x] No SQL injection risk (no SQL database)

### 2.4 Transaction Safety
- [x] Server builds transactions, client signs — server never holds secret keys
- [x] All transactions use correct PDA derivation
- [x] Transaction serialization uses Borsh (type-safe)
- [x] Server sets `recentBlockhash` at build time

### 2.5 CORS
- [x] CORS configured for production domain only
- [x] Dev mode allows localhost
- [x] No wildcard origins in production
- [ ] **TODO**: Add CSP headers for API responses

---

## 3. Frontend Security

### 3.1 Wallet Integration
- [x] Phantom-only connection (no email/password)
- [x] No private keys ever touch the frontend
- [x] Transaction signing delegated to wallet extension
- [x] Auth messages signed by wallet, verified by backend

### 3.2 Encryption Pipeline
- [x] AES-256-GCM via WebCrypto SubtleCrypto API
- [x] 12-byte random IV per encryption
- [x] HKDF key derivation (SHA-256, 256-bit output)
- [x] Key material derived from Phantom signature (never stored)
- [x] Encrypted blobs include version byte for future migration
- [x] Server receives **only** pre-encrypted data
- [x] Shamir's Secret Sharing for guardian key shards (GF(256))

### 3.3 Client-Side Data
- [x] No sensitive data in localStorage
- [x] No vault keys persisted between sessions
- [x] Session data cleared on wallet disconnect
- [ ] **TODO**: Add CSP meta tags to Next.js pages

### 3.4 XSS Prevention
- [x] React's built-in escaping for all rendered content
- [x] No `dangerouslySetInnerHTML` usage
- [x] External links use `rel="noopener noreferrer"`
- [x] User-input CIDs are validated before rendering as links

---

## 4. Mobile Security

### 4.1 Wallet Adapter
- [x] Uses `@solana-mobile/mobile-wallet-adapter-protocol` v2.1
- [x] `transact()` wraps all wallet interactions
- [x] Re-authorization required for each transaction
- [x] No private keys stored in app

### 4.2 Data Storage
- [x] MMKV for local preferences (non-sensitive only)
- [x] No encrypted data cached on device
- [x] Auth tokens scoped to session
- [ ] **TODO**: Add biometric lock for app access

---

## 5. Encryption E2E Verification

### 5.1 Encrypt Path
```
User file → SubtleCrypto AES-256-GCM encrypt → base64 encode →
POST /vault/upload (pre-encrypted) → Arweave storage →
CID stored on-chain via add_file instruction
```
- [x] File never leaves browser unencrypted
- [x] Backend never sees plaintext
- [x] Arweave stores only ciphertext

### 5.2 Decrypt Path (Heir)
```
Gather Shamir shards from guardians → reconstruct vault key →
Fetch CIDs from on-chain → Download from Arweave →
SubtleCrypto AES-256-GCM decrypt → plaintext file
```
- [x] Decryption only possible with threshold shards
- [x] No single guardian can decrypt alone
- [x] Heir-side decryption implemented in `decryption.ts`

### 5.3 Key Management
- [x] Vault key derived from Phantom signature + HKDF
- [x] Key split into N shards via Shamir's Secret Sharing
- [x] Threshold reconstruction (k-of-n)
- [x] Shards encrypted and stored per-guardian on-chain
- [ ] **REVIEW**: Shard distribution UX — guardians need secure channel

---

## 6. Infrastructure Recommendations

### Pre-Mainnet
- [ ] Engage Solana security auditor (Ottersec, Neodyme, etc.)
- [ ] Formal verification of state machine transitions
- [ ] Fuzz testing for Rust instruction handlers
- [ ] Load testing for backend API endpoints
- [ ] Penetration testing for web frontend

### Deployment
- [ ] Program should be deployed as upgradeable with multisig authority
- [ ] Backend should run behind CDN with DDoS protection
- [ ] Environment variables secured via vault (HashiCorp/AWS Secrets)
- [ ] CI/CD pipeline with automated test gates
- [ ] Monitoring: error rate, latency, Solana tx success rate

---

## 7. Summary

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Smart Contracts | ✅ Ready for audit | 0 critical, 3 review items |
| Backend API | ✅ Functional | 2 TODOs (rate limiting, CSP) |
| Frontend | ✅ Functional | 1 TODO (CSP headers) |
| Mobile | ✅ Scaffold complete | 1 TODO (biometric lock) |
| Encryption | ✅ E2E verified | 1 review (shard distribution UX) |

**Overall Assessment**: Ready for external security audit and devnet testing.
No critical vulnerabilities identified in code review.
