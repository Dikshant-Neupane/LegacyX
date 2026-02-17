import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';

import { vaultRoutes } from './routes/vault';
import { identityRoutes } from './routes/identity';
import { recoveryRoutes } from './routes/recovery';
import { whistleblowerRoutes } from './routes/whistleblower';
import { explorerRoutes } from './routes/explorer';
import { registerValidationErrorHandler } from './middleware/validation';
import { handleCronRequest } from './jobs/checkInMonitor';

dotenv.config();

const server = Fastify({
  logger: {
    level: 'info',
    // SECURITY: Never log file content, key material, or biometric data
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          hostname: req.hostname,
          remoteAddress: req.ip,
        };
      },
    },
  },
});

async function start() {
  // CORS
  await server.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Global validation error handler
  registerValidationErrorHandler(server);

  // Routes
  await server.register(vaultRoutes, { prefix: '/api/vault' });
  await server.register(identityRoutes, { prefix: '/api/identity' });
  await server.register(recoveryRoutes, { prefix: '/api/recovery' });
  await server.register(whistleblowerRoutes, { prefix: '/api/whistleblower' });
  await server.register(explorerRoutes, { prefix: '/api/explorer' });

  // Health check
  server.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Cron endpoint for Vercel cron
  server.get('/api/cron/check-in-monitor', async () => handleCronRequest());

  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`LegacyX backend running on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export default server;
