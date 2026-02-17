# LegacyX — System Architecture

> **Not even we can touch it.**

## High-Level Architecture

```mermaid
graph TB
    subgraph Client ["Client Layer (Zero-Trust Boundary)"]
        PW[Phantom Wallet<br/>Sole Authentication]
        FE[Next.js 14 Frontend<br/>Vercel Edge]
        ENC[SubtleCrypto<br/>AES-256-GCM Encryption]
        BIO[Biometric Capture<br/>SHA-256 Hashing]
        THR[Three.js<br/>Vault Orb Renderer]
    end

    subgraph ServerLayer ["Server Layer (Intentionally Blind)"]
        API[Fastify API<br/>Vercel Serverless]
        CRON[Check-In Monitor<br/>Vercel Cron]
        NOTIFY[Notification Service<br/>Email + Push]
        LINK[Explorer Link Builder<br/>Solscan / Explorer / Orb]
    end

    subgraph Blockchain ["Blockchain Layer (Immutable Truth)"]
        SOL[Solana Program<br/>Anchor Framework]
        PDA[Program Derived Accounts<br/>Vault PDAs]
        TOKEN[Token Extensions<br/>Vault Certificate NFT]
    end

    subgraph Storage ["Permanent Storage Layer"]
        AR[Arweave<br/>Encrypted File Storage]
    end

    PW -->|Signs Transactions| FE
    FE -->|Encrypted Blobs Only| API
    ENC -->|AES-256-GCM| FE
    BIO -->|SHA-256 Hash Only| FE
    FE -->|RPC Calls| SOL
    API -->|Encrypted Blobs| AR
    API -->|Instructions| SOL
    AR -->|CID Returns| API
    SOL -->|PDAs| PDA
    SOL -->|Mint| TOKEN
    CRON -->|Poll PDAs| SOL
    CRON -->|Trigger Alerts| NOTIFY
    LINK -->|Format URLs| FE
```

## Three-Layer Vault Architecture

```mermaid
graph LR
    subgraph Layer1 ["Layer 1: Access Control"]
        PHANTOM[Phantom Wallet<br/>Ed25519 Keypair]
        BIOMETRIC[Device Biometric<br/>Face ID / Fingerprint]
        GUARDIAN[Guardian Multisig<br/>3-of-N Recovery]
    end

    subgraph Layer2 ["Layer 2: Rules & Keys (Solana)"]
        VAULT_PDA[Vault PDA Account]
        CONDITIONS[Condition Rules]
        HEIRS[Heir Assignments]
        SHARDS[Encrypted Key Shards]
        IDENTITY[Identity Proof Hash]
        CERT[Certificate NFT<br/>Token Extensions]
    end

    subgraph Layer3 ["Layer 3: Encrypted Storage (Arweave)"]
        FILES[Encrypted Files<br/>AES-256-GCM Chunks]
        MESSAGES[Encrypted Messages<br/>Voice / Video / Text]
        EVIDENCE[Encrypted Evidence<br/>Whistleblower Data]
    end

    PHANTOM --> VAULT_PDA
    BIOMETRIC --> VAULT_PDA
    GUARDIAN --> VAULT_PDA
    VAULT_PDA --> CONDITIONS
    VAULT_PDA --> HEIRS
    VAULT_PDA --> SHARDS
    VAULT_PDA --> IDENTITY
    VAULT_PDA --> CERT
    VAULT_PDA -->|CID References| FILES
    VAULT_PDA -->|CID References| MESSAGES
    VAULT_PDA -->|CID References| EVIDENCE
```

## Encryption Pipeline

```mermaid
sequenceDiagram
    participant User as User Device
    participant Crypto as SubtleCrypto API
    participant Phantom as Phantom Wallet
    participant API as Vercel API
    participant Arweave as Arweave
    participant Solana as Solana Program

    User->>Crypto: Raw file / message
    Crypto->>Crypto: Generate AES-256-GCM key via HKDF from wallet keypair
    Crypto->>Crypto: Encrypt file → ciphertext blob
    Crypto->>Crypto: Split key via Shamir's Secret Sharing → N shards
    User->>API: Send encrypted blob ONLY (server never sees plaintext)
    API->>Arweave: Upload encrypted blob
    Arweave-->>API: Return permanent CID
    API->>Solana: Store CID + encrypted key shards on PDA
    Phantom->>Solana: Owner signs transaction
    Solana-->>User: Confirm — emit VaultUpdated event

    Note over User,Solana: Server NEVER touches unencrypted data
```

## Vault Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Active: create_vault (Phantom signs)
    Active --> Active: check_in (resets timer)
    Active --> Triggered: check_in_interval exceeded
    Triggered --> Active: check_in (within grace period)
    Triggered --> Released: grace_period expired → release_to_heir
    Released --> Burned: burn_message (heir reads & burns)
    Active --> Active: social_recovery (guardian multisig reassigns owner)

    state Active {
        [*] --> Healthy
        Healthy --> Warning: 30 days remain
        Warning --> Critical: 7 days remain
        Critical --> Healthy: check_in resets
    }

    state Triggered {
        [*] --> GracePeriod
        GracePeriod: 30-day countdown
        GracePeriod --> WhistleblowerBroadcast: if whistleblower configured
    }
```

## Smart Contract Instruction Map

```mermaid
flowchart TB
    subgraph Core ["Core Vault Instructions"]
        CV[create_vault<br/>Initialize PDA, set interval, mint certificate]
        CI[check_in<br/>Owner signs, reset timestamp]
        TR[trigger_release<br/>Anyone calls after interval exceeded]
        RH[release_to_heir<br/>After trigger + grace period]
    end

    subgraph Advanced ["Advanced Features"]
        CR[conditional_release<br/>Heir proves condition on-chain]
        BM[burn_message<br/>Heir reads, CID deleted forever]
        SR[social_recovery<br/>M-of-N guardian Phantom multisig]
        IP[identity_proof<br/>SHA-256 biometric hash on-chain]
        WB[whistleblower_vault<br/>Auto-broadcast to 1000 wallets]
        MC[mint_certificate<br/>Token Extension NFT proof]
    end

    CV --> CI
    CI -->|Missed| TR
    TR -->|Grace Period| RH
    RH --> CR
    RH --> BM
    CV --> MC
    CV --> SR
    CV --> IP
    TR --> WB
```

## Explorer Integration Points

| Action | Solscan | Solana Explorer | Orb (Helius) |
|--------|---------|-----------------|--------------|
| Vault Created | ✅ Transaction link | ✅ Account link | ✅ Visual |
| Check-In Completed | ✅ Transaction link | — | ✅ Visual |
| File Uploaded (CID stored) | ✅ Transaction link | — | — |
| Heir Added | ✅ Transaction link | — | — |
| Vault Triggered | ✅ Transaction link | ✅ Account status | ✅ Visual |
| Vault Released | ✅ Transaction link | ✅ Account status | ✅ Visual |
| Message Burned | ✅ Transaction link | — | — |
| Identity Proved | ✅ Transaction link | ✅ Account link | ✅ Visual |
| Certificate Minted | ✅ Token link | ✅ Token link | — |
| Social Recovery | ✅ Transaction link | ✅ Account link | — |
| Whistleblower Broadcast | ✅ Transaction link | — | ✅ Visual |

## PDA Seed Derivation

| Account | Seeds | Description |
|---------|-------|-------------|
| VaultAccount | `["vault", owner_pubkey]` | Main vault PDA per user |
| VaultCondition | `["condition", vault_pubkey, condition_index]` | Per-condition PDA |
| IdentityProof | `["identity", owner_pubkey]` | Biometric proof PDA |
| GuardianRecord | `["guardian", vault_pubkey, guardian_pubkey]` | Per-guardian approval record |
| WhistleblowerConfig | `["whistleblower", vault_pubkey]` | Broadcast wallet list |
| VaultCertificate | `["certificate", vault_pubkey]` | Token Extension mint account |

## Security Zones

```mermaid
graph TB
    subgraph TrustZone ["TRUSTED — User Device Only"]
        direction TB
        RAW[Raw Files]
        RAWBIO[Raw Biometrics]
        KEYS[Encryption Keys]
        PLAINTEXT[Plaintext Messages]
    end

    subgraph BlindZone ["BLIND — Server (Vercel)"]
        direction TB
        ENCBLOB[Encrypted Blobs]
        METADATA[Request Metadata]
        CIDS[Arweave CIDs]
    end

    subgraph ImmutableZone ["IMMUTABLE — Blockchain"]
        direction TB
        HASHES[SHA-256 Hashes]
        ENCSHARDS[Encrypted Key Shards]
        STOREDCIDS[Stored CIDs]
        RULES[Vault Rules & Conditions]
    end

    TrustZone -->|AES-256-GCM| BlindZone
    TrustZone -->|SHA-256| ImmutableZone
    BlindZone -->|Upload| ImmutableZone

    style TrustZone fill:#1a3a1a,stroke:#4A9B6F
    style BlindZone fill:#3a3a1a,stroke:#D4782A
    style ImmutableZone fill:#1a1a3a,stroke:#C9A96E
```

## Data Flow — What Goes Where

| Data Type | Device | Server | Arweave | Solana |
|-----------|--------|--------|---------|--------|
| Raw files | ✅ Exists temporarily | ❌ Never | ❌ Never | ❌ Never |
| Encrypted files | ✅ Created here | ✅ Passes through | ✅ Stored permanently | ❌ Too large |
| Arweave CIDs | ✅ Displayed | ✅ Routes through | ✅ Generated here | ✅ Stored on PDA |
| Encryption keys | ✅ Derived, used, destroyed | ❌ Never | ❌ Never | ❌ Never |
| Key shards (encrypted) | ✅ Created here | ✅ Passes through | ❌ Not stored | ✅ Stored on PDA |
| Biometric raw data | ✅ Captured & destroyed | ❌ Never | ❌ Never | ❌ Never |
| Biometric SHA-256 hash | ✅ Created here | ✅ Passes through | ❌ Not stored | ✅ Stored on PDA |
| Vault rules | ✅ Set by owner | ✅ Passes through | ❌ Not stored | ✅ Stored on PDA |
| Phantom wallet signature | ✅ Signed here | ✅ Verified here | ❌ Not involved | ✅ Verified on-chain |
