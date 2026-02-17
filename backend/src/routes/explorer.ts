import { FastifyInstance } from 'fastify';
import { explorerLinkBuilder } from '../services/explorerLinks';

export async function explorerRoutes(server: FastifyInstance) {
  /**
   * GET /api/explorer/:txid
   * Return formatted Solscan, Solana Explorer, and Orb links for any transaction
   */
  server.get('/:txid', async (request, reply) => {
    const { txid } = request.params as { txid: string };

    return {
      success: true,
      links: explorerLinkBuilder.getTransactionLinks(txid),
    };
  });
}
