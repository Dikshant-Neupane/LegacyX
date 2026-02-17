import { FastifyInstance } from 'fastify';
import { verifyPhantomSignature } from '../middleware/auth';
import { solanaService } from '../services/solana';
import { explorerLinkBuilder } from '../services/explorerLinks';
import { identityProofSchema } from '../types';

export async function identityRoutes(server: FastifyInstance) {
  // POST /api/identity/proof — Build unsigned identity_proof tx
  server.post('/proof', async (request, reply) => {
    const body = identityProofSchema.parse(request.body);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid Phantom Wallet signature' });
    }

    try {
      const faceHashBuf = Buffer.from(body.faceHash, 'hex');
      const voiceHashBuf = Buffer.from(body.voiceHash, 'hex');

      const { transaction, identityPda } = await solanaService.buildIdentityProofTx({
        ownerPubkey: body.ownerPubkey,
        faceHash: faceHashBuf,
        voiceHash: voiceHashBuf,
      });

      return {
        success: true,
        transaction,
        identityPda,
        identityProof: {
          owner: body.ownerPubkey,
          faceHash: body.faceHash,
          voiceHash: body.voiceHash,
        },
        links: explorerLinkBuilder.getAccountLinks(identityPda),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to build identity proof transaction' });
    }
  });

  // GET /api/identity/:pubkey — Read identity proof PDA
  server.get('/:pubkey', async (request, reply) => {
    const { pubkey } = request.params as { pubkey: string };

    try {
      const { PublicKey } = await import('@solana/web3.js');
      const owner = new PublicKey(pubkey);
      const [identityPda] = solanaService.deriveIdentityPda(owner);
      const connection = solanaService.getConnection();
      const accountInfo = await connection.getAccountInfo(identityPda);

      if (!accountInfo) {
        return reply.status(404).send({ error: 'Identity proof not found' });
      }

      // Parse identity proof data (skip 8-byte discriminator)
      const data = accountInfo.data as Buffer;
      let offset = 8;
      const ownerKey = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
      offset += 32;
      const faceHash = data.subarray(offset, offset + 32).toString('hex');
      offset += 32;
      const voiceHash = data.subarray(offset, offset + 32).toString('hex');
      offset += 32;
      const provedAt = Number(data.readBigInt64LE(offset));
      offset += 8;
      const isActive = data.readUInt8(offset) === 1;

      return {
        success: true,
        identityProof: {
          pda: identityPda.toBase58(),
          owner: ownerKey,
          faceHash,
          voiceHash,
          provedAt,
          isActive,
        },
        links: explorerLinkBuilder.getAccountLinks(identityPda.toBase58()),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch identity proof' });
    }
  });
}
