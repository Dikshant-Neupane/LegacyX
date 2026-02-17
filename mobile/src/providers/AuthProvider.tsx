/**
 * Solana Mobile Wallet Adapter Provider
 *
 * Wraps the app with Solana Mobile Wallet Adapter context.
 * Handles wallet connection, disconnection, and transaction signing.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

interface AuthContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

const AuthContext = createContext<AuthContextType>({
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: async (tx) => tx,
  signMessage: async (msg) => msg,
});

export const useAuth = () => useContext(AuthContext);

const APP_IDENTITY = {
  name: 'LegacyX',
  uri: 'https://legacyx.app',
  icon: 'favicon.ico',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        const result = await wallet.authorize({
          cluster: 'devnet',
          identity: APP_IDENTITY,
        });

        const pubkey = new PublicKey(result.accounts[0].address);
        setPublicKey(pubkey);
        setAuthToken(result.auth_token);
      });
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setAuthToken(null);
  }, []);

  const signTransaction = useCallback(
    async (tx: Transaction): Promise<Transaction> => {
      if (!authToken) throw new Error('Not connected');

      let signed: Transaction = tx;
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: authToken,
          identity: APP_IDENTITY,
        });
        const result = await wallet.signTransactions({
          transactions: [tx],
        });
        signed = result[0];
      });
      return signed;
    },
    [authToken],
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!authToken) throw new Error('Not connected');

      let signature: Uint8Array = new Uint8Array();
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: authToken,
          identity: APP_IDENTITY,
        });
        const result = await wallet.signMessages({
          addresses: [publicKey!.toBytes()],
          payloads: [message],
        });
        signature = result[0];
      });
      return signature;
    },
    [authToken, publicKey],
  );

  return (
    <AuthContext.Provider
      value={{
        publicKey,
        connected: publicKey !== null,
        connecting,
        connect,
        disconnect,
        signTransaction,
        signMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
