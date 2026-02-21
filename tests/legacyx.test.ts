/**
 * SoulVault — Anchor Integration Tests
 *
 * Test suite for all 6 program instructions:
 * 1. create_vault
 * 2. check_in
 * 3. set_beneficiary
 * 4. add_file
 * 5. trigger_release
 * 6. release_to_beneficiary
 *
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

describe('SoulVault', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Legacyx as Program<Legacyx>;

  const owner = provider.wallet;
  const beneficiary = Keypair.generate();
  const attacker = Keypair.generate();

  // PDA seeds
  const VAULT_SEED = 'soulvault';

  let vaultPDA: PublicKey;
  let vaultBump: number;

  before(async () => {
    // Derive vault PDA
    [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), owner.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to beneficiary and attacker for fees
    const sig1 = await provider.connection.requestAirdrop(
      beneficiary.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);

    const sig2 = await provider.connection.requestAirdrop(
      attacker.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);
  });

  // =========================================================================
  // 1. CREATE VAULT
  // =========================================================================

  describe('create_vault', () => {
    it('creates a vault with valid parameters', async () => {
      const thirtyDays = 30 * 24 * 60 * 60;

      await program.methods
        .createVault('My SoulVault', new anchor.BN(thirtyDays), null)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);

      assert.equal(vault.owner.toBase58(), owner.publicKey.toBase58());
      assert.equal(vault.vaultName, 'My SoulVault');
      assert.equal(vault.checkInInterval.toNumber(), thirtyDays);
      assert.isNull(vault.beneficiary);
      assert.deepEqual(vault.ipfsCids, []);
      assert.equal(vault.fileCount, 0);
      assert.equal(vault.bump, vaultBump);
      // Status should be Active (enum variant index 0)
      assert.deepEqual(vault.vaultStatus, { active: {} });
    });

    it('rejects empty vault name', async () => {
      const owner2 = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        owner2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      const [vaultPDA2] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), owner2.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createVault('', new anchor.BN(30 * 86400), null)
          .accounts({
            vault: vaultPDA2,
            owner: owner2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'VaultNameEmpty');
      }
    });

    it('rejects vault name > 32 chars', async () => {
      const owner2 = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        owner2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      const [vaultPDA2] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), owner2.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createVault('A'.repeat(33), new anchor.BN(30 * 86400), null)
          .accounts({
            vault: vaultPDA2,
            owner: owner2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'VaultNameTooLong');
      }
    });

    it('rejects check-in interval < 30 days', async () => {
      const owner2 = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        owner2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      const [vaultPDA2] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), owner2.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createVault('Test', new anchor.BN(86400), null) // 1 day
          .accounts({
            vault: vaultPDA2,
            owner: owner2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'InvalidCheckInInterval');
      }
    });

    it('rejects beneficiary == owner', async () => {
      const owner2 = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        owner2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      const [vaultPDA2] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), owner2.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createVault('Test', new anchor.BN(30 * 86400), owner2.publicKey)
          .accounts({
            vault: vaultPDA2,
            owner: owner2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'BeneficiaryIsOwner');
      }
    });
  });

  // =========================================================================
  // 2. CHECK IN
  // =========================================================================

  describe('check_in', () => {
    it('owner can check in', async () => {
      const vaultBefore = await program.account.vaultAccount.fetch(vaultPDA);
      const oldCheckIn = vaultBefore.lastCheckIn.toNumber();

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 1500));

      await program.methods
        .checkIn()
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.isAbove(vault.lastCheckIn.toNumber(), oldCheckIn);
      assert.deepEqual(vault.vaultStatus, { active: {} });
    });

    it('non-owner cannot check in', async () => {
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
        // Will fail on PDA seed derivation or has_one constraint
        assert.ok(err);
      }
    });
  });

  // =========================================================================
  // 3. SET BENEFICIARY
  // =========================================================================

  describe('set_beneficiary', () => {
    it('owner sets a beneficiary', async () => {
      await program.methods
        .setBeneficiary(beneficiary.publicKey)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.equal(
        vault.beneficiary!.toBase58(),
        beneficiary.publicKey.toBase58()
      );
    });

    it('rejects setting self as beneficiary', async () => {
      try {
        await program.methods
          .setBeneficiary(owner.publicKey)
          .accounts({
            vault: vaultPDA,
            owner: owner.publicKey,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'BeneficiaryIsOwner');
      }
    });
  });

  // =========================================================================
  // 4. ADD FILE
  // =========================================================================

  describe('add_file', () => {
    it('owner adds an IPFS CID', async () => {
      const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

      await program.methods
        .addFile(testCid)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.equal(vault.ipfsCids.length, 1);
      assert.equal(vault.ipfsCids[0], testCid);
      assert.equal(vault.fileCount, 1);
    });

    it('owner adds multiple files', async () => {
      const cid2 = 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenesa7ii';

      await program.methods
        .addFile(cid2)
        .accounts({
          vault: vaultPDA,
          owner: owner.publicKey,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(vaultPDA);
      assert.equal(vault.ipfsCids.length, 2);
      assert.equal(vault.fileCount, 2);
    });

    it('rejects empty CID', async () => {
      try {
        await program.methods
          .addFile('')
          .accounts({
            vault: vaultPDA,
            owner: owner.publicKey,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'CidEmpty');
      }
    });

    it('rejects CID > 64 chars', async () => {
      try {
        await program.methods
          .addFile('a'.repeat(65))
          .accounts({
            vault: vaultPDA,
            owner: owner.publicKey,
          })
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'CidTooLong');
      }
    });
  });

  // =========================================================================
  // 5. TRIGGER RELEASE (time-based — cannot fully test without warp)
  // =========================================================================

  describe('trigger_release', () => {
    it('rejects trigger when interval not exceeded', async () => {
      try {
        await program.methods
          .triggerRelease()
          .accounts({
            vault: vaultPDA,
            caller: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'IntervalNotExceeded');
      }
    });

    // NOTE: Full trigger/release flow would require Solana Clock warp (bankrun)
    // which is not available in standard anchor test. Below are structural tests.
  });

  // =========================================================================
  // 6. RELEASE TO BENEFICIARY (structural test)
  // =========================================================================

  describe('release_to_beneficiary', () => {
    it('rejects release when vault is not Triggered', async () => {
      try {
        await program.methods
          .releaseToBeneficiary()
          .accounts({
            vault: vaultPDA,
            beneficiary: beneficiary.publicKey,
          })
          .signers([beneficiary])
          .rpc();
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.include(err.message, 'VaultNotTriggered');
      }
    });
  });

  // =========================================================================
  // FULL LIFECYCLE (integration)
  // =========================================================================

  describe('full lifecycle — new vault', () => {
    let owner2: Keypair;
    let beneficiary2: Keypair;
    let vaultPDA2: PublicKey;

    before(async () => {
      owner2 = Keypair.generate();
      beneficiary2 = Keypair.generate();

      const sig1 = await provider.connection.requestAirdrop(
        owner2.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig1);

      const sig2 = await provider.connection.requestAirdrop(
        beneficiary2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig2);

      [vaultPDA2] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), owner2.publicKey.toBuffer()],
        program.programId
      );
    });

    it('creates vault with beneficiary + adds files + checks in', async () => {
      const ninetyDays = 90 * 24 * 60 * 60;

      // Create vault with beneficiary
      await program.methods
        .createVault('Legacy Vault', new anchor.BN(ninetyDays), beneficiary2.publicKey)
        .accounts({
          vault: vaultPDA2,
          owner: owner2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner2])
        .rpc();

      let vault = await program.account.vaultAccount.fetch(vaultPDA2);
      assert.equal(vault.vaultName, 'Legacy Vault');
      assert.equal(vault.beneficiary!.toBase58(), beneficiary2.publicKey.toBase58());
      assert.deepEqual(vault.vaultStatus, { active: {} });

      // Add a file
      await program.methods
        .addFile('bafytest123456789abcdef')
        .accounts({
          vault: vaultPDA2,
          owner: owner2.publicKey,
        })
        .signers([owner2])
        .rpc();

      vault = await program.account.vaultAccount.fetch(vaultPDA2);
      assert.equal(vault.fileCount, 1);

      // Check in
      await new Promise((r) => setTimeout(r, 1500));
      await program.methods
        .checkIn()
        .accounts({
          vault: vaultPDA2,
          owner: owner2.publicKey,
        })
        .signers([owner2])
        .rpc();

      vault = await program.account.vaultAccount.fetch(vaultPDA2);
      assert.deepEqual(vault.vaultStatus, { active: {} });

      // Update beneficiary
      const newBen = Keypair.generate();
      await program.methods
        .setBeneficiary(newBen.publicKey)
        .accounts({
          vault: vaultPDA2,
          owner: owner2.publicKey,
        })
        .signers([owner2])
        .rpc();

      vault = await program.account.vaultAccount.fetch(vaultPDA2);
      assert.equal(vault.beneficiary!.toBase58(), newBen.publicKey.toBase58());
    });
  });
});
