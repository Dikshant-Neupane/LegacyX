import { FastifyInstance } from 'fastify';

// ============================================================================
// RATE LIMITER CONFIGURATION FOR LEGACYX API
// Uses @fastify/rate-limit — configured in server.ts as global plugin.
// This module exports route-specific overrides.
// ============================================================================

/**
 * Route-specific rate limit configs.
 * More sensitive operations get tighter limits.
 */
export const rateLimits = {
  /** Vault creation — expensive on-chain op, limit to 5/min */
  createVault: {
    max: 5,
    timeWindow: '1 minute',
  },

  /** Check-in — moderate frequency expected */
  checkIn: {
    max: 10,
    timeWindow: '1 minute',
  },

  /** File upload — Arweave costs money */
  upload: {
    max: 10,
    timeWindow: '1 minute',
  },

  /** Identity proof — one-time operation per session */
  identityProof: {
    max: 5,
    timeWindow: '1 minute',
  },

  /** Social recovery — guardian signs, limited */
  socialRecovery: {
    max: 10,
    timeWindow: '1 minute',
  },

  /** Read operations — more permissive */
  read: {
    max: 60,
    timeWindow: '1 minute',
  },

  /** Explorer links — lightweight, very permissive */
  explorer: {
    max: 120,
    timeWindow: '1 minute',
  },
};

/**
 * Registers route-level rate limiting using Fastify's config.rateLimit.
 * Applied per-route in route handlers via `config: { rateLimit: rateLimits.xxx }`.
 */
export function applyRateLimitConfig(
  route: keyof typeof rateLimits,
): { config: { rateLimit: (typeof rateLimits)[keyof typeof rateLimits] } } {
  return {
    config: {
      rateLimit: rateLimits[route],
    },
  };
}
