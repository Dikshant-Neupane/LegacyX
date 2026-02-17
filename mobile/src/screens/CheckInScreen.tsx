/**
 * CheckInScreen — One-tap heartbeat for LegacyX mobile
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import { theme } from '../theme';

export function CheckInScreen() {
  const { publicKey, signMessage, signTransaction } = useAuth();
  const [status, setStatus] = useState<'idle' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    if (!publicKey) return;
    try {
      const data = await api.get<{ lastCheckIn: number }>(`/vault?owner=${publicKey}`);
      setLastCheckIn(data.lastCheckIn);
    } catch (_) {
      // no vault yet
    }
  }, [publicKey]);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  const handleCheckIn = async () => {
    if (!publicKey || !signMessage || !signTransaction) return;
    try {
      setStatus('signing');
      setError(null);

      // Sign auth message
      const msg = `LegacyX Check-In: ${Date.now()}`;
      const encoder = new TextEncoder();
      const signature = await signMessage(encoder.encode(msg));
      const sigBase64 = Buffer.from(signature).toString('base64');

      // Get transaction from backend
      setStatus('sending');
      const { transaction: txBase64 } = await api.post<{ transaction: string }>(
        '/vault/check-in',
        { owner: publicKey, signature: sigBase64, message: msg },
      );

      // Sign and send
      const txBytes = Buffer.from(txBase64, 'base64');
      const signed = await signTransaction(txBytes);
      await api.post('/vault/send-transaction', {
        signedTransaction: Buffer.from(signed).toString('base64'),
      });

      setStatus('done');
      setLastCheckIn(Math.floor(Date.now() / 1000));
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
      setStatus('error');
    }
  };

  const buttonLabel = {
    idle: 'CHECK IN NOW',
    signing: 'Signing…',
    sending: 'Sending…',
    done: 'CONFIRMED  ✓',
    error: 'TRY AGAIN',
  }[status];

  const lastDate = lastCheckIn
    ? new Date(lastCheckIn * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Heartbeat</Text>
        <Text style={styles.subtitle}>
          Confirm you're still here. Missing a check-in starts the inheritance
          countdown.
        </Text>

        {/* Pulse ring */}
        <View style={styles.pulseRing}>
          <View style={styles.pulseInner}>
            <Text style={styles.pulseIcon}>♥</Text>
          </View>
        </View>

        <Text style={styles.lastLabel}>LAST CHECK-IN</Text>
        <Text style={styles.lastDate}>{lastDate}</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.button,
            status === 'done' && styles.buttonDone,
            (status === 'signing' || status === 'sending') && styles.buttonDisabled,
          ]}
          onPress={status === 'done' ? undefined : handleCheckIn}
          disabled={status === 'signing' || status === 'sending'}
          activeOpacity={0.85}
        >
          {(status === 'signing' || status === 'sending') ? (
            <ActivityIndicator color={theme.colors.bg} size="small" />
          ) : (
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    lineHeight: 20,
  },
  pulseRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  pulseInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseIcon: {
    fontSize: 40,
    color: theme.colors.gold,
  },
  lastLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  lastDate: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: theme.fontSize.sm,
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: theme.radius.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonDone: {
    backgroundColor: theme.colors.green,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.bg,
    fontSize: theme.fontSize.base,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
