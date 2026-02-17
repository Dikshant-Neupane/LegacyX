import { FastifyInstance } from 'fastify';
import { verifyPhantomSignature } from '../middleware/auth';
import { solanaService } from '../services/solana';
import { notificationService } from '../services/notification';
import { configureWhistleblowerSchema, checkInSchema } from '../types';

export async function whistleblowerRoutes(server: FastifyInstance) {
  // POST /api/whistleblower/configure — Build unsigned configure_whistleblower tx
  server.post('/configure', async (request, reply) => {
    const body = configureWhistleblowerSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const { transaction } = await solanaService.buildConfigureWhistleblowerTx({
        ownerPubkey: body.ownerPubkey,
        broadcastWallets: body.broadcastWallets,
      });

      return {
        success: true,
        transaction,
        whistleblower: {
          vault: body.vaultPubkey,
          walletCount: body.broadcastWallets.length,
          configured: true,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build whistleblower configuration transaction' });
    }
  });

  // POST /api/whistleblower/broadcast — Trigger the irreversible broadcast
  server.post('/broadcast', async (request, reply) => {
    const body = checkInSchema.parse(request.body); // any signer can trigger

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      // Read vault to get CID count for notification
      const { exists, vault } = await solanaService.getVaultAccount(body.ownerPubkey);
      if (!exists || !vault) {
        return reply.status(404).send({ error: 'Vault not found' });
      }

      return {
        success: true,
        broadcast: {
          vault: vault.pubkey,
          cidCount: vault.fileCount,
          status: 'broadcast_ready',
          message: 'Sign and submit the transaction to execute irreversible broadcast',
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare whistleblower broadcast' });
    }
  });
}
