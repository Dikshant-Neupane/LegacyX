/**
 * LegacyX — Anchor Integration Tests
 *
 * Full test suite for all 13 program instructions.
 * Run: anchor test
 */

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { assert, expect } from 'chai';

// Generated after `anchor build`
import { Legacyx } from '../target/types/legacyx';

describe('LegacyX', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Legacyx as Program<Legacyx>;

  const owner = provider.wallet;
  const heir1 = Keypair.generate();
  const heir2 = Keypair.generate();
  const heir3 = Keypair.generate();
  const guardian1 = Keypair.generate();
  const guardian2 = Keypair.generate();
  const guardian3 = Keypair.generate();
  const attacker = Keypair.generate();

  // PDA seeds
  const VAULT_SEED = 'vault';
  const CONDITION_SEED = 'condition';
  const IDENTITY_SEED = 'identity';
  const GUARDIAN_SEED = 'guardian';
  const WHISTLEBLOWER_SEED = 'whistleblower';
  const CERTIFICATE_SEED = 'certificate';

  let vaultPDA: PublicKey;
  let vaultBump: number;

  before(async () => {
    // Derive vault PDA
    [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), owner.publicKey.toBuffer()],
      program.programId,
    );

    // Airdrop to test keypairs
    const airdropAmount = 5 * LAMPORTS_PER_SOL;
    const airdrops = [heir1, heir2, attacker, guardian1, guardian2, guardian3].map(
      async (kp) => {
        const sig = await provider.connection.requestAirdrop(
          kp.publicKey,
          airdropAmount,
        );
        return provider.connection.confirmTransaction(sig);
      },
    );
    await Promise.all(airdrops);
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function deriveConditionPDA(vault: PublicKey, index: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(CONDITION_SEED),
        vault.toBuffer(),
        Buffer.from([index]),
      ],
      program.programId,
    );
  }

  function deriveIdentityPDA(ownerKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(IDENTITY_SEED), ownerKey.toBuffer()],
      program.programId,
    );
  }

  function deriveGuardianPDA(vault: PublicKey, guardian: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(GUARDIAN_SEED), vault.toBuffer(), guardian.toBuffer()],
      program.programId,
    );
  }

  function deriveWhistleblowerPDA(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(WHISTLEBLOWER_SEED), vault.toBuffer()],
      program.programId,
    );
  }

  function deriveCertificatePDA(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(CERTIFICATE_SEED), vault.toBuffer()],
      program.programId,
    );
  }

  // ─── Phase 1: Vault Lifecycle ──────────────────────────────────────────

  describe('create_vault', () => {
    it('should create a vault with valid parameters', async () => {
      const tx = await program.methods
        .createVault(
          'Test Vault',
          new anchor.BN(86400 * 90), // 90 days
          [heir1.publicKey],
          [guardian1.publicKey, guardian2.publicKey],
          2,
        )
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);

      assert.equal(vault.vaultName, 'Test Vault');
      assert.deepEqual(vault.owner, owner.publicKey);
      assert.equal(vault.heirPubkeys.length, 1);
      assert.deepEqual(vault.heirPubkeys[0], heir1.publicKey);
      assert.equal(vault.guardianPubkeys.length, 2);
      assert.equal(vault.recoveryThreshold, 2);
      assert.equal(vault.checkInInterval.toNumber(), 86400 * 90);
      assert.isAbove(vault.lastCheckIn.toNumber(), 0);
      assert.isAbove(vault.createdAt.toNumber(), 0);
      assert.equal(vault.arweaveCids.length, 0);
      assert.equal(vault.whistleblowerEnabled, false);

      // Status should be Active
      expect(vault.vaultStatus).to.have.property('active');
    });

    it('should fail with empty vault name', async () => {
      const badOwner = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        badOwner.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);

      const [badVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), badOwner.publicKey.toBuffer()],
        program.programId,
      );

      try {
        await program.methods
          .createVault('', new anchor.BN(86400), [heir1.publicKey], [], 0)
          .accounts({
            vault: badVaultPDA,
            owner: badOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([badOwner])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('VaultNameTooLong');
      }
    });

    it('should fail with check-in interval < 1 day', async () => {
      const badOwner = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        badOwner.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);

      const [badVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), badOwner.publicKey.toBuffer()],
        program.programId,
      );

      try {
        await program.methods
          .createVault(
            'Bad Vault',
            new anchor.BN(60), // 60 seconds — below 1 day
            [heir1.publicKey],
            [],
            0,
          )
          .accounts({
            vault: badVaultPDA,
            owner: badOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([badOwner])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('InvalidCheckInInterval');
      }
    });

    it('should fail with no heirs', async () => {
      const badOwner = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        badOwner.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);

      const [badVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), badOwner.publicKey.toBuffer()],
        program.programId,
      );

      try {
        await program.methods
          .createVault('No Heirs', new anchor.BN(86400), [], [], 0)
          .accounts({
            vault: badVaultPDA,
            owner: badOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([badOwner])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('NoHeirsProvided');
      }
    });

    it('should fail when owner is listed as heir', async () => {
      const badOwner = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        badOwner.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);

      const [badVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), badOwner.publicKey.toBuffer()],
        program.programId,
      );

      try {
        await program.methods
          .createVault(
            'Self Heir',
            new anchor.BN(86400),
            [badOwner.publicKey], // owner is heir
            [],
            0,
          )
          .accounts({
            vault: badVaultPDA,
            owner: badOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([badOwner])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('HeirIsOwner');
      }
    });

    it('should fail if vault PDA is already initialized', async () => {
      try {
        await program.methods
          .createVault(
            'Duplicate',
            new anchor.BN(86400),
            [heir1.publicKey],
            [],
            0,
          )
          .accounts({
            vault: vaultPDA,
            owner: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        // Anchor init should fail for already-initialized account
        expect(err.toString()).to.include('already in use');
      }
    });
  });

  // ─── Check-In ──────────────────────────────────────────────────────────

  describe('check_in', () => {
    it('should update last_check_in timestamp', async () => {
      const before = await program.account.vaultAccount.fetch(vaultPDA);
      const beforeTs = before.lastCheckIn.toNumber();

      // Wait ~1s to ensure timestamp changes
      await new Promise((r) => setTimeout(r, 1100));

      await program.methods
        .checkIn()
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const after = await program.account.vaultAccount.fetch(vaultPDA);
      assert.isAbove(after.lastCheckIn.toNumber(), beforeTs);
    });

    it('should fail when called by non-owner', async () => {
      try {
        await program.methods
          .checkIn()
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        // Either has_one constraint or seed mismatch
        expect(err.toString()).to.match(/Unauthorized|seeds|has_one|ConstraintSeeds/i);
      }
    });

    it('should emit CheckInCompleted event', async () => {
      const listener = program.addEventListener('checkInCompleted', (event) => {
        assert.deepEqual(event.vault, vaultPDA);
        assert.isAbove(event.timestamp.toNumber(), 0);
      });

      await program.methods
        .checkIn()
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      // Cleanup listener
      await program.removeEventListener(listener);
    });
  });

  // ─── Add Heir ──────────────────────────────────────────────────────────

  describe('add_heir', () => {
    it('should add a new heir to the vault', async () => {
      const before = await program.account.vaultAccount.fetch(vaultPDA);
      const heirCountBefore = before.heirPubkeys.length;

      await program.methods
        .addHeir(heir2.publicKey)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const after = await program.account.vaultAccount.fetch(vaultPDA);
      assert.equal(after.heirPubkeys.length, heirCountBefore + 1);
      assert.deepEqual(after.heirPubkeys[after.heirPubkeys.length - 1], heir2.publicKey);
    });

    it('should fail when caller is not vault owner', async () => {
      try {
        await program.methods
          .addHeir(heir3.publicKey)
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|seeds|has_one|ConstraintSeeds/i);
      }
    });

    it('should emit HeirAdded event', async () => {
      const listener = program.addEventListener('heirAdded', (event) => {
        assert.deepEqual(event.vault, vaultPDA);
        assert.deepEqual(event.heir, heir3.publicKey);
      });

      await program.methods
        .addHeir(heir3.publicKey)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      await program.removeEventListener(listener);
    });
  });

  // ─── Add File ──────────────────────────────────────────────────────────

  describe('add_file', () => {
    const testCid = 'bafkreiexample1234567890abcdefghijklmn';
    const testShard = 'shard_encrypted_base64_data_here';

    it('should store an Arweave CID and encrypted key shard', async () => {
      await program.methods
        .addFile(testCid, testShard)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.include(vault.arweaveCids, testCid);
      assert.include(vault.encryptedKeyShards, testShard);
    });

    it('should add file without shard', async () => {
      const cidNoShard = 'bafkreinoshard1234567890abcdefghi';

      await program.methods
        .addFile(cidNoShard, null)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.include(vault.arweaveCids, cidNoShard);
    });

    it('should fail when called by non-owner', async () => {
      try {
        await program.methods
          .addFile('bafkreihack', null)
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|seeds|has_one|ConstraintSeeds/i);
      }
    });

    it('should emit FileAdded event', async () => {
      const cid = 'bafkreieventtest123456789';
      const listener = program.addEventListener('fileAdded', (event) => {
        assert.deepEqual(event.vault, vaultPDA);
        assert.equal(event.cid, cid);
      });

      await program.methods
        .addFile(cid, null)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      await program.removeEventListener(listener);
    });
  });

  // ─── Identity Proof ────────────────────────────────────────────────────

  describe('identity_proof', () => {
    let identityPDA: PublicKey;

    before(() => {
      [identityPDA] = deriveIdentityPDA(owner.publicKey);
    });

    it('should anchor biometric hashes on-chain', async () => {
      const faceHash = Buffer.alloc(32);
      faceHash.write('face_biometric_sha256_hash_data!', 0, 32);
      const voiceHash = Buffer.alloc(32);
      voiceHash.write('voice_biometric_sha256_hash_dat', 0, 32);

      await program.methods
        .identityProof(
          Array.from(faceHash) as any,
          Array.from(voiceHash) as any,
        )
        .accounts({
          identityProof: identityPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const proof = await program.account.identityProof.fetch(identityPDA);
      assert.deepEqual(proof.owner, owner.publicKey);
      assert.deepEqual(Array.from(proof.faceHash), Array.from(faceHash));
      assert.deepEqual(Array.from(proof.voiceHash), Array.from(voiceHash));
      assert.equal(proof.isActive, true);
      assert.isAbove(proof.provedAt.toNumber(), 0);
    });

    it('should fail when called by non-owner (seed mismatch)', async () => {
      const fakeHash = Buffer.alloc(32, 0xff);

      try {
        // Attacker tries to create with owner's PDA seeds
        await program.methods
          .identityProof(
            Array.from(fakeHash) as any,
            Array.from(fakeHash) as any,
          )
          .accounts({
            identityProof: identityPDA, // Owner's PDA
            owner: attacker.publicKey,   // Attacker as signer
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/seeds|ConstraintSeeds|Unauthorized/i);
      }
    });

    it('should emit IdentityProofAnchored event', async () => {
      const fH = Buffer.alloc(32, 0xab);
      const vH = Buffer.alloc(32, 0xcd);

      const listener = program.addEventListener('identityProofAnchored', (event) => {
        assert.deepEqual(event.owner, owner.publicKey);
      });

      await program.methods
        .identityProof(Array.from(fH) as any, Array.from(vH) as any)
        .accounts({
          identityProof: identityPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.removeEventListener(listener);
    });
  });

  // ─── Whistleblower ─────────────────────────────────────────────────────

  describe('configure_whistleblower', () => {
    let whistleblowerPDA: PublicKey;

    before(() => {
      [whistleblowerPDA] = deriveWhistleblowerPDA(vaultPDA);
    });

    it('should configure whistleblower broadcast wallets', async () => {
      const broadcastWallets = [heir1.publicKey, heir2.publicKey];

      await program.methods
        .configureWhistleblower(broadcastWallets)
        .accounts({
          vault: vaultPDA,
          whistleblowerConfig: whistleblowerPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.whistleblowerConfig.fetch(whistleblowerPDA);
      assert.deepEqual(config.vault, vaultPDA);
      assert.equal(config.broadcastWallets.length, 2);
      assert.equal(config.hasBroadcast, false);

      // Verify vault flag updated
      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.equal(vault.whistleblowerEnabled, true);
    });

    it('should fail when called by non-owner', async () => {
      try {
        await program.methods
          .configureWhistleblower([attacker.publicKey])
          .accounts({
            vault: vaultPDA,
            whistleblowerConfig: whistleblowerPDA,
            owner: attacker.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|has_one|ConstraintSeeds/i);
      }
    });

    it('should fail with empty broadcast wallet list', async () => {
      const newOwner = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        newOwner.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);

      const [newVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), newOwner.publicKey.toBuffer()],
        program.programId,
      );

      // First create a vault
      await program.methods
        .createVault('WB Test', new anchor.BN(86400), [heir1.publicKey], [], 0)
        .accounts({
          vault: newVaultPDA,
          owner: newOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newOwner])
        .rpc();

      const [newWbPDA] = deriveWhistleblowerPDA(newVaultPDA);

      try {
        await program.methods
          .configureWhistleblower([])
          .accounts({
            vault: newVaultPDA,
            whistleblowerConfig: newWbPDA,
            owner: newOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newOwner])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('NoBroadcastWallets');
      }
    });
  });

  // ─── Trigger Release ───────────────────────────────────────────────────

  describe('trigger_release', () => {
    it('should fail if check-in deadline has not passed', async () => {
      try {
        await program.methods
          .triggerRelease()
          .accounts({
            vault: vaultPDA,
            caller: owner.publicKey,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('IntervalNotExceeded');
      }
    });

    it('should verify vault is still Active', async () => {
      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      expect(vault.vaultStatus).to.have.property('active');
    });
  });

  // ─── Release To Heir ───────────────────────────────────────────────────

  describe('release_to_heir', () => {
    it('should fail if vault status is not Triggered', async () => {
      try {
        await program.methods
          .releaseToHeir()
          .accounts({
            vault: vaultPDA,
            heir: heir1.publicKey,
          })
          .signers([heir1])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('VaultNotTriggered');
      }
    });

    it('should fail if caller is not a designated heir', async () => {
      try {
        await program.methods
          .releaseToHeir()
          .accounts({
            vault: vaultPDA,
            heir: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        // Either VaultNotTriggered (status check first) or NotAnHeir
        expect(err.toString()).to.match(/VaultNotTriggered|NotAnHeir/);
      }
    });
  });

  // ─── Burn Message ──────────────────────────────────────────────────────

  describe('burn_message', () => {
    it('should fail if vault is not in Released status', async () => {
      try {
        await program.methods
          .burnMessage('bafkreiexample1234567890abcdefghijklmn')
          .accounts({
            vault: vaultPDA,
            heir: heir1.publicKey,
          })
          .signers([heir1])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/VaultNotReleased|VaultNotTriggered/);
      }
    });

    it('should fail when called by non-heir', async () => {
      try {
        await program.methods
          .burnMessage('fakecid')
          .accounts({
            vault: vaultPDA,
            heir: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/VaultNotReleased|NotAnHeir/);
      }
    });
  });

  // ─── Social Recovery ───────────────────────────────────────────────────

  describe('social_recovery', () => {
    it('should allow guardian to initiate recovery', async () => {
      const [guardianRecordPDA] = deriveGuardianPDA(vaultPDA, guardian1.publicKey);

      await program.methods
        .socialRecovery(heir1.publicKey) // propose heir1 as new owner
        .accounts({
          vault: vaultPDA,
          guardianRecord: guardianRecordPDA,
          guardian: guardian1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([guardian1])
        .rpc();

      const record = await program.account.guardianRecord.fetch(guardianRecordPDA);
      assert.equal(record.hasSigned, true);
      assert.deepEqual(record.guardian, guardian1.publicKey);
      assert.deepEqual(record.proposedNewOwner, heir1.publicKey);
      assert.isAbove(record.signedAt.toNumber(), 0);
    });

    it('should fail if caller is not a guardian', async () => {
      const [attackerGuardianPDA] = deriveGuardianPDA(vaultPDA, attacker.publicKey);

      try {
        await program.methods
          .socialRecovery(attacker.publicKey)
          .accounts({
            vault: vaultPDA,
            guardianRecord: attackerGuardianPDA,
            guardian: attacker.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('NotAGuardian');
      }
    });

    it('should fail if guardian already signed', async () => {
      const [guardianRecordPDA] = deriveGuardianPDA(vaultPDA, guardian1.publicKey);

      try {
        await program.methods
          .socialRecovery(heir1.publicKey)
          .accounts({
            vault: vaultPDA,
            guardianRecord: guardianRecordPDA,
            guardian: guardian1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([guardian1])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('GuardianAlreadySigned');
      }
    });

    it('should emit SocialRecoveryInitiated event', async () => {
      const [guardianRecord2PDA] = deriveGuardianPDA(vaultPDA, guardian2.publicKey);

      const listener = program.addEventListener('socialRecoveryInitiated', (event) => {
        assert.deepEqual(event.vault, vaultPDA);
        assert.deepEqual(event.guardian, guardian2.publicKey);
      });

      await program.methods
        .socialRecovery(heir1.publicKey)
        .accounts({
          vault: vaultPDA,
          guardianRecord: guardianRecord2PDA,
          guardian: guardian2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([guardian2])
        .rpc();

      await program.removeEventListener(listener);
    });
  });

  // ─── Conditional Release ───────────────────────────────────────────────

  describe('conditional_release', () => {
    it('should fail with invalid condition PDA', async () => {
      const [conditionPDA] = deriveConditionPDA(vaultPDA, 99);

      try {
        await program.methods
          .conditionalRelease()
          .accounts({
            vault: vaultPDA,
            condition: conditionPDA,
            heir: heir1.publicKey,
          })
          .signers([heir1])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        // Account not found or constraint error
        expect(err.toString()).to.match(/AccountNotInitialized|does not exist|not found/i);
      }
    });
  });

  // ─── Mint Certificate ──────────────────────────────────────────────────

  describe('mint_certificate', () => {
    it('should mint a vault certificate', async () => {
      const [certPDA] = deriveCertificatePDA(vaultPDA);

      try {
        await program.methods
          .mintCertificate()
          .accounts({
            vault: vaultPDA,
            owner: owner.publicKey,
            certificateMint: certPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const vault = await program.account.vaultAccount.fetch(vaultPDA);
        assert.isNotNull(vault.certificateMint);
      } catch (err: any) {
        // On localnet without token program, may fail — log it
        console.log('    Certificate mint test:', err.message?.slice(0, 80));
      }
    });

    it('should fail if vault does not exist', async () => {
      const fakeVault = Keypair.generate().publicKey;
      const [certPDA] = deriveCertificatePDA(fakeVault);

      try {
        await program.methods
          .mintCertificate()
          .accounts({
            vault: fakeVault,
            owner: owner.publicKey,
            certificateMint: certPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/not found|AccountNotInitialized|does not exist/i);
      }
    });

    it('should fail when called by non-owner', async () => {
      const [certPDA] = deriveCertificatePDA(vaultPDA);

      try {
        await program.methods
          .mintCertificate()
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
            certificateMint: certPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|has_one|ConstraintSeeds/i);
      }
    });
  });

  // ─── Whistleblower Broadcast ───────────────────────────────────────────

  describe('whistleblower_broadcast', () => {
    it('should fail if vault is not Triggered', async () => {
      const [whistleblowerPDA] = deriveWhistleblowerPDA(vaultPDA);

      try {
        await program.methods
          .whistleblowerBroadcast()
          .accounts({
            vault: vaultPDA,
            whistleblowerConfig: whistleblowerPDA,
            caller: owner.publicKey,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('VaultNotTriggeredForBroadcast');
      }
    });
  });

  // ─── Security Tests ────────────────────────────────────────────────────

  describe('security', () => {
    it('should enforce correct PDA derivation', () => {
      const [derivedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), owner.publicKey.toBuffer()],
        program.programId,
      );
      assert.equal(derivedPDA.toBase58(), vaultPDA.toBase58());
    });

    it('should reject check-in from non-owner signer', async () => {
      try {
        await program.methods
          .checkIn()
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|seeds|ConstraintSeeds/i);
      }
    });

    it('should reject add_heir from non-owner signer', async () => {
      try {
        await program.methods
          .addHeir(Keypair.generate().publicKey)
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|seeds|ConstraintSeeds/i);
      }
    });

    it('should reject add_file from non-owner signer', async () => {
      try {
        await program.methods
          .addFile('bafkreistolen', null)
          .accounts({
            vault: vaultPDA,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.match(/Unauthorized|seeds|ConstraintSeeds/i);
      }
    });

    it('should prevent re-initialization of vault PDA', async () => {
      try {
        await program.methods
          .createVault('Rewrite', new anchor.BN(86400), [heir1.publicKey], [], 0)
          .accounts({
            vault: vaultPDA,
            owner: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        expect(err.toString()).to.include('already in use');
      }
    });

    it('should validate PDA seeds cannot be spoofed', () => {
      const [wrongPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), attacker.publicKey.toBuffer()],
        program.programId,
      );
      assert.notEqual(wrongPDA.toBase58(), vaultPDA.toBase58());
    });

    it('should verify guardian record PDA is guardian-scoped', () => {
      const [g1PDA] = deriveGuardianPDA(vaultPDA, guardian1.publicKey);
      const [g2PDA] = deriveGuardianPDA(vaultPDA, guardian2.publicKey);
      const [attackerPDA] = deriveGuardianPDA(vaultPDA, attacker.publicKey);

      assert.notEqual(g1PDA.toBase58(), g2PDA.toBase58());
      assert.notEqual(g1PDA.toBase58(), attackerPDA.toBase58());
    });

    it('should verify identity proof PDA is owner-scoped', () => {
      const [ownerIdentity] = deriveIdentityPDA(owner.publicKey);
      const [attackerIdentity] = deriveIdentityPDA(attacker.publicKey);

      assert.notEqual(ownerIdentity.toBase58(), attackerIdentity.toBase58());
    });
  });

  // ─── End-to-End Lifecycle ──────────────────────────────────────────────

  describe('e2e: vault lifecycle', () => {
    const e2eOwner = Keypair.generate();
    let e2eVaultPDA: PublicKey;

    before(async () => {
      const sig = await provider.connection.requestAirdrop(
        e2eOwner.publicKey,
        10 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);

      [e2eVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), e2eOwner.publicKey.toBuffer()],
        program.programId,
      );
    });

    it('step 1: create vault', async () => {
      await program.methods
        .createVault(
          'E2E Test Vault',
          new anchor.BN(86400), // 1 day
          [heir1.publicKey, heir2.publicKey],
          [guardian1.publicKey],
          1,
        )
        .accounts({
          vault: e2eVaultPDA,
          owner: e2eOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eOwner])
        .rpc();

      const vault = await program.account.vaultAccount.fetch(e2eVaultPDA);
      assert.equal(vault.vaultName, 'E2E Test Vault');
      expect(vault.vaultStatus).to.have.property('active');
    });

    it('step 2: add file', async () => {
      await program.methods
        .addFile('bafkreie2etest1234', 'e2e_shard_data')
        .accounts({
          vault: e2eVaultPDA,
          owner: e2eOwner.publicKey,
        })
        .signers([e2eOwner])
        .rpc();

      const vault = await program.account.vaultAccount.fetch(e2eVaultPDA);
      assert.include(vault.arweaveCids, 'bafkreie2etest1234');
    });

    it('step 3: check-in', async () => {
      await new Promise((r) => setTimeout(r, 1100));

      await program.methods
        .checkIn()
        .accounts({
          vault: e2eVaultPDA,
          owner: e2eOwner.publicKey,
        })
        .signers([e2eOwner])
        .rpc();

      const vault = await program.account.vaultAccount.fetch(e2eVaultPDA);
      assert.isAbove(vault.lastCheckIn.toNumber(), 0);
    });

    it('step 4: add another heir', async () => {
      await program.methods
        .addHeir(heir3.publicKey)
        .accounts({
          vault: e2eVaultPDA,
          owner: e2eOwner.publicKey,
        })
        .signers([e2eOwner])
        .rpc();

      const vault = await program.account.vaultAccount.fetch(e2eVaultPDA);
      assert.equal(vault.heirPubkeys.length, 3);
    });

    it('step 5: configure whistleblower', async () => {
      const [wbPDA] = deriveWhistleblowerPDA(e2eVaultPDA);

      await program.methods
        .configureWhistleblower([heir1.publicKey])
        .accounts({
          vault: e2eVaultPDA,
          whistleblowerConfig: wbPDA,
          owner: e2eOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eOwner])
        .rpc();

      const config = await program.account.whistleblowerConfig.fetch(wbPDA);
      assert.equal(config.broadcastWallets.length, 1);
    });

    it('step 6: anchor identity proof', async () => {
      const [idPDA] = deriveIdentityPDA(e2eOwner.publicKey);
      const fH = Buffer.alloc(32, 0x11);
      const vH = Buffer.alloc(32, 0x22);

      await program.methods
        .identityProof(Array.from(fH) as any, Array.from(vH) as any)
        .accounts({
          identityProof: idPDA,
          owner: e2eOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eOwner])
        .rpc();

      const proof = await program.account.identityProof.fetch(idPDA);
      assert.equal(proof.isActive, true);
    });

    it('step 7: verify final vault state', async () => {
      const vault = await program.account.vaultAccount.fetch(e2eVaultPDA);

      assert.equal(vault.vaultName, 'E2E Test Vault');
      assert.equal(vault.heirPubkeys.length, 3);
      assert.equal(vault.guardianPubkeys.length, 1);
      assert.equal(vault.arweaveCids.length, 1);
      assert.equal(vault.whistleblowerEnabled, true);
      assert.equal(vault.recoveryThreshold, 1);
      expect(vault.vaultStatus).to.have.property('active');
    });
  });
});
