import { FastifyInstance } from 'fastify';
import { verifyPhantomSignature } from '../middleware/auth';
import { arweaveService } from '../services/arweave';
import { solanaService } from '../services/solana';
import { explorerLinkBuilder } from '../services/explorerLinks';
import { notificationService } from '../services/notification';
import {
  createVaultSchema,
  checkInSchema,
  uploadFileSchema,
  addHeirSchema,
  addFileSchema,
  burnMessageSchema,
} from '../types';

export async function vaultRoutes(server: FastifyInstance) {
  // POST /api/vault/create — Build unsigned create_vault tx for Phantom signing
  server.post('/create', async (request, reply) => {
    const body = createVaultSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction, vaultPda } = await solanaService.buildCreateVaultTx({
        ownerPubkey: body.ownerPubkey,
        vaultName: body.vaultName,
        checkInInterval: body.checkInInterval,
        heirPubkeys: body.heirPubkeys,
        guardianPubkeys: body.guardianPubkeys,
        recoveryThreshold: body.recoveryThreshold,
      });

      // Notify heirs they've been added
      body.heirPubkeys.forEach((heir) => {
        notificationService.notifyHeirAdded(heir, vaultPda, body.ownerPubkey);
      });

      return {
        success: true,
        transaction, // base64 unsigned tx for frontend to sign + send
        vaultPda,
        vault: {
          owner: body.ownerPubkey,
          name: body.vaultName,
          checkInInterval: body.checkInInterval,
          heirCount: body.heirPubkeys.length,
          guardianCount: body.guardianPubkeys.length,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build create vault transaction' });
    }
  });

  // POST /api/vault/checkin — Build unsigned check_in tx
  server.post('/checkin', async (request, reply) => {
    const body = checkInSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction } = await solanaService.buildCheckInTx(body.ownerPubkey);

      return {
        success: true,
        transaction,
        checkInAt: new Date().toISOString(),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build check-in transaction' });
    }
  });

  // POST /api/vault/upload — Encrypt blob → Arweave, then build add_file tx
  server.post('/upload', async (request, reply) => {
    const body = uploadFileSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      // Upload pre-encrypted blob to Arweave
      const encryptedBuffer = Buffer.from(body.encryptedData, 'base64');
      const arweaveCid = await arweaveService.upload(encryptedBuffer, body.contentType);
      const arweaveUrl = arweaveService.getUrl(arweaveCid);

      // Build add_file tx to store CID on-chain
      const { transaction } = await solanaService.buildAddFileTx({
        ownerPubkey: body.ownerPubkey,
        arweaveCid,
        encryptedKeyShard: body.encryptedKeyShard,
      });

      return {
        success: true,
        transaction,
        arweaveCid,
        arweaveUrl,
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to upload file' });
    }
  });

  // POST /api/vault/add-heir — Build unsigned add_heir tx
  server.post('/add-heir', async (request, reply) => {
    const body = addHeirSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction } = await solanaService.buildAddHeirTx({
        ownerPubkey: body.ownerPubkey,
        heirPubkey: body.heirPubkey,
      });

      const [vaultPda] = solanaService.deriveVaultPda(
        new (await import('@solana/web3.js')).PublicKey(body.ownerPubkey),
      );
      notificationService.notifyHeirAdded(body.heirPubkey, vaultPda.toBase58(), body.ownerPubkey);

      return { success: true, transaction };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build add heir transaction' });
    }
  });

  // POST /api/vault/add-file — Build unsigned add_file tx (CID already on Arweave)
  server.post('/add-file', async (request, reply) => {
    const body = addFileSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction } = await solanaService.buildAddFileTx({
        ownerPubkey: body.ownerPubkey,
        arweaveCid: body.arweaveCid,
        encryptedKeyShard: body.encryptedKeyShard,
      });

      return { success: true, transaction };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build add file transaction' });
    }
  });

  // POST /api/vault/burn — Build unsigned burn_message tx
  server.post('/burn', async (request, reply) => {
    const body = burnMessageSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.heirPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction } = await solanaService.buildBurnMessageTx({
        heirPubkey: body.heirPubkey,
        vaultOwnerPubkey: body.vaultOwnerPubkey,
        cidToBurn: body.cidToBurn,
      });

      return { success: true, transaction };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build burn message transaction' });
    }
  });

  // POST /api/vault/mint-certificate — Build unsigned mint_certificate tx
  server.post('/mint-certificate', async (request, reply) => {
    const body = checkInSchema.parse(request.body); // same schema: ownerPubkey + sig

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction, certificatePda } = await solanaService.buildMintCertificateTx(body.ownerPubkey);

      return {
        success: true,
        transaction,
        certificatePda,
        links: explorerLinkBuilder.getAccountLinks(certificatePda),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build mint certificate transaction' });
    }
  });

  // GET /api/vault/:pubkey — Read vault PDA data from chain
  server.get('/:pubkey', async (request, reply) => {
    const { pubkey } = request.params as { pubkey: string };

    try {
      const { exists, vault } = await solanaService.getVaultAccount(pubkey);

      if (!exists || !vault) {
        return reply.status(404).send({ error: 'Vault not found' });
      }

      return {
        success: true,
        vault,
        links: explorerLinkBuilder.getAccountLinks(vault.pubkey),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch vault data' });
    }
  });

  // GET /api/vault/:pubkey/certificate — Get certificate info with explorer links
  server.get('/:pubkey/certificate', async (request, reply) => {
    const { pubkey } = request.params as { pubkey: string };

    try {
      const { exists, vault } = await solanaService.getVaultAccount(pubkey);

      if (!exists || !vault) {
        return reply.status(404).send({ error: 'Vault not found' });
      }

      if (!vault.certificateMint) {
        return reply.status(404).send({ error: 'No certificate minted for this vault' });
      }

      return {
        success: true,
        certificate: {
          vaultPubkey: vault.pubkey,
          owner: vault.owner,
          mintAddress: vault.certificateMint,
          createdAt: vault.createdAt,
          links: {
            ...explorerLinkBuilder.getAccountLinks(vault.pubkey),
            certificate: explorerLinkBuilder.getTokenLinks(vault.certificateMint),
          },
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch certificate' });
    }
  });

  // GET /api/vault/:pubkey/notifications — Get notifications for a wallet
  server.get('/:pubkey/notifications', async (request, reply) => {
    const { pubkey } = request.params as { pubkey: string };
    const { unread } = request.query as { unread?: string };

    const notifications = notificationService.getNotifications(pubkey, unread === 'true');
    return {
      success: true,
      notifications,
      unreadCount: notificationService.getUnreadCount(pubkey),
    };
  });
}
