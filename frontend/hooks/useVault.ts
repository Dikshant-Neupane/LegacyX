'use client';

import { useContext } from 'react';
import { VaultContext, type VaultContextValue, type VaultData } from '@/contexts/VaultContext';

export type { VaultData };

/**
 * useVault — reads from the shared VaultContext so that every component
 * that needs vault state (Header, Footer, pages) shares a single API call
 * and a single loading / hasVault / error state.
 */
export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  return ctx;
}
