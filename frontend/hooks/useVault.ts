'use client';

import { useContext } from 'react';
import { VaultContext, type VaultContextValue, type VaultData } from '@/contexts/VaultContext';

export type { VaultData };

/**
 * useVault — reads from the shared VaultContext.
 * All vault state is on-chain. No centralized backend.
 */
export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  return ctx;
}
