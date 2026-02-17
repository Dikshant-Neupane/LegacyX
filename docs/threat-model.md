# LegacyX — Security Threat Model

> **Zero-Trust Principle:** The server is intentionally blind. If our entire backend is compromised, no user data is exposed — because we never had it.

---

## 1. Security Zones

### Zone 1: Trusted — User Device Only
| Asset | Protection | Lifetime |
|-------|-----------|----------|
| Raw files (photos, documents) | AES-256-GCM encryption before any network call | Encrypted immediately, plaintext destroyed |
| Raw biometric data (face, voice) | SHA-256 hashing via SubtleCrypto | Hashed then destroyed from memory |
| Encryption keys | HKDF derivation from Phantom Wallet keypair | Used for encryption, never persisted |
| Plaintext messages | Encrypted in-browser before saving | Never leaves device unencrypted |

### Zone 2: Blind — Server (Vercel Serverless)
| Asset | What server sees | What server CANNOT see |
|-------|-----------------|----------------------|
| File uploads | Encrypted binary blobs only | Original file content, filenames, metadata |
| Biometric submissions | 32-byte SHA-256 hash only | Face images, voice recordings |
| API requests | Route, timestamp, wallet pubkey | Any user-generated content |
| Arweave CIDs | CID strings (content addresses) | What the CID points to (encrypted) |

### Zone 3: Immutable — Blockchain (Solana + Arweave)
| Asset | Storage | Immutability |
|-------|---------|-------------|
| Vault PDA (rules, heirs, CIDs) | Solana account data | Modifiable only by program logic |
| Encrypted files | Arweave permanent storage | Permanent — cannot be deleted |
| Identity proof hashes | Solana account data | Timestamped, verifiable by anyone |
| Key shards (encrypted) | Solana PDA | Released only by program rules |

---

## 2. Threat Matrix

### T1: Compromised Server
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Attacker gains full server access | **None** — server holds zero user data | All encryption is client-side. Server only routes encrypted blobs. |
| Attacker modifies API responses | Could show fake vault state | Client verifies all state directly from Solana RPC, not server. |
| Attacker intercepts API requests | Sees encrypted blobs only | AES-256-GCM ciphertext without key is computationally unbreakable. |

### T2: Compromised Phantom Wallet
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Private key stolen | Attacker can check-in as owner | Social recovery: 3-of-N guardians can reassign ownership. |
| Attacker triggers vault release | Would need to wait check-in interval + grace period | Owner has 30-day grace period to check-in and cancel. |
| Attacker burns messages | CIDs removed from chain | Vault must be in Released state — attacker needs to miss check-ins first. |

### T3: Compromised Arweave
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Arweave data exfiltrated | **None** — all data is AES-256-GCM encrypted | Without key shards (on Solana), data is computationally unbreakable. |
| Arweave data lost (theoretical) | Encrypted files inaccessible | Arweave's permanent storage model with 200-year endowment. Multiple replicas. |

### T4: Solana Chain Compromise
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| 51% attack | Could rewrite vault state | Solana's PoS with slashing makes this economically infeasible. |
| RPC node manipulation | Client sees wrong vault state | Use multiple RPC endpoints with fallback. Verify critical state across nodes. |
| Program exploit | Could bypass vault rules | Anchor framework constraints, comprehensive test suite, all PDAs use deterministic seeds. |

### T5: Deepfake / Identity Fraud
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Someone creates deepfake of owner | Could impersonate owner | Identity proof SHA-256 anchored on-chain with timestamp proves biometric existed before deepfake. |
| Biometric data harvested | **None** — only hash stored | Raw biometric data never leaves device, never stored anywhere. |

### T6: Key Loss
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Owner loses Phantom Wallet | Cannot check-in, vault eventually triggers | Social recovery: 3-of-N guardians reassign ownership to new wallet. |
| Heir loses wallet | Cannot claim released vault | Multiple heirs can be assigned. Owner can update heirs while alive. |
| Guardian loses wallet | One less signer for recovery | M-of-N threshold designed to tolerate guardian loss. 3-of-5 means 2 can be lost. |

### T7: Timing Attacks
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Attacker prevents owner from checking in | Vault triggers prematurely | 30-day grace period. Multiple check-in channels (web, mobile, API). |
| Solana network congestion delays check-in | Missed deadline | Use priority fees. Grace period provides large buffer. |

### T8: Social Engineering
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Attacker convinces guardians to recover | Vault ownership stolen | M-of-N threshold requires multiple guardians colluding. Choose guardians wisely. |
| Phishing for Phantom Wallet | Private key compromised | Phantom Wallet's own security model. LegacyX never asks for seed phrase. |

---

## 3. Encryption Pipeline Security

```
USER DEVICE                    NETWORK                    STORAGE
┌─────────────────┐           ┌──────────┐           ┌───────────┐
│ Raw File         │──encrypt──│ HTTPS    │──upload───│ Arweave   │
│ AES-256-GCM key │           │ (TLS 1.3)│           │ (encrypted│
│ derived from     │           │          │           │  blob)    │
│ Phantom Wallet   │           └──────────┘           └───────────┘
│ via HKDF         │                                        │
│                  │           ┌──────────┐           ┌─────v─────┐
│ Key split via    │──shards──│ HTTPS    │──store────│ Solana    │
│ Shamir's SSS     │           │ (TLS 1.3)│           │ PDA       │
│                  │           └──────────┘           │(enc shards│
│ Raw key DESTROYED│                                  │ + CIDs)   │
│ from memory      │                                  └───────────┘
└─────────────────┘
```

### Key Properties
- **Key derivation**: HKDF-SHA256 from Phantom Wallet Ed25519 keypair
- **Encryption**: AES-256-GCM with unique IV per file
- **Key splitting**: Shamir's Secret Sharing (M-of-N threshold)
- **Key storage**: NEVER stored — derived on-demand, destroyed after use
- **Key reconstruction**: Only possible with M-of-N heir shards combined

---

## 4. Attack Surface Minimization

| Surface | Status | Notes |
|---------|--------|-------|
| Email authentication | **Eliminated** | Phantom Wallet is the sole auth method |
| Password storage | **Eliminated** | No passwords anywhere in the system |
| OAuth tokens | **Eliminated** | No OAuth integration |
| Session management | **Eliminated** | Each request is Phantom-signed, stateless |
| Database (user data) | **Eliminated** | No database stores user content — only Solana + Arweave |
| File storage (server) | **Eliminated** | Server is a pass-through for encrypted blobs |
| Admin panel | **Eliminated** | No admin access to user data — there is no user data on server |
| API keys in code | **Mitigated** | All keys in Vercel environment variables, never committed |
| CORS | **Mitigated** | Strict origin policy in Vercel config |
| CSP headers | **Implemented** | Content-Security-Policy via vercel.json |

---

## 5. Failure Mode Documentation

| Component | Failure Mode | Fallback |
|-----------|-------------|----------|
| Solana RPC | Node unreachable | Automatic fallback to 3 backup RPC endpoints |
| Arweave Upload | Upload timeout | Retry with exponential backoff (3 attempts) |
| Phantom Wallet | Extension not installed | Clear error message with install link to Phantom |
| Check-in cron | Cron job fails | Grace period provides 30-day buffer. Multiple notification channels. |
| Frontend (Vercel) | Deployment failure | Vercel automatic rollback to last successful deployment |
| Biometric capture | Camera/mic denied | Clear permission request UI. Alternative: manual file upload |
| Encryption | SubtleCrypto unavailable | Only possible on HTTP (not HTTPS). Vercel enforces HTTPS. |

---

## 6. Compliance Notes

- **No PII stored on servers** — GDPR data minimization by design
- **Right to be forgotten** — user controls all data via Phantom Wallet
- **Data portability** — all data on Arweave (permanent, user-accessible)
- **Biometric data** — never stored, only hashed (BIPA compliant approach)

---

## 7. Security Headers (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(self), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://arweave.net; connect-src 'self' https://*.solana.com https://*.helius-rpc.com https://arweave.net wss://*.solana.com; font-src 'self'; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

---

*Last updated: February 2026*
*Document version: 1.0*
*Status: Pre-deployment review*
