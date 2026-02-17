import { FastifyInstance } from 'fastify';
import { verifyPhantomSignature } from '../middleware/auth';
import { solanaService } from '../services/solana';
import { notificationService } from '../services/notification';
import { socialRecoverySchema } from '../types';

export async function recoveryRoutes(server: FastifyInstance) {
  // POST /api/recovery/sign — Guardian signs for social recovery (also initiates)
  server.post('/sign', async (request, reply) => {
    const body = socialRecoverySchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.guardianPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      // First, read vault to get owner pubkey from the vault PDA
      const { exists, vault } = await solanaService.getVaultAccount(body.vaultPubkey);
      if (!exists || !vault) {
        return reply.status(404).send({ error: 'Vault not found' });
      }

      const { transaction } = await solanaService.buildSocialRecoveryTx({
        guardianPubkey: body.guardianPubkey,
        vaultOwnerPubkey: vault.owner,
        proposedNewOwner: body.proposedNewOwner,
      });

      // Notify other guardians about the recovery attempt
      vault.guardianPubkeys
        .filter((g) => g !== body.guardianPubkey)
        .forEach((guardian) => {
          notificationService.requestGuardianSign(guardian, vault.pubkey, body.proposedNewOwner);
        });

      return {
        success: true,
        transaction,
        recovery: {
          vault: body.vaultPubkey,
          proposedNewOwner: body.proposedNewOwner,
          signedBy: body.guardianPubkey,
          threshold: vault.recoveryThreshold,
          totalGuardians: vault.guardianCount,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build social recovery transaction' });
    }
  });

  // GET /api/recovery/:vaultPubkey/status — Check recovery progress
  server.get('/:vaultPubkey/status', async (request, reply) => {
    const { vaultPubkey } = request.params as { vaultPubkey: string };

    try {
      const { exists, vault } = await solanaService.getVaultAccount(vaultPubkey);
      if (!exists || !vault) {
        return reply.status(404).send({ error: 'Vault not found' });
      }

      return {
        success: true,
        recovery: {
          vault: vaultPubkey,
          guardianCount: vault.guardianCount,
          threshold: vault.recoveryThreshold,
          guardians: vault.guardianPubkeys,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch recovery status' });
    }
  });
}
